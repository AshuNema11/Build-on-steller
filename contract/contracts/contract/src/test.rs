#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{token, Address, Env};

fn setup() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let parent = Address::generate(&env);
    let child = Address::generate(&env);

    // Deploy a Stellar Asset Contract token
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    // Mint some tokens to parent
    let token_admin = token::StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&parent, &1_000_000_000);

    (env, token_addr, parent, child)
}

#[test]
fn test_create_allowance() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);

    assert_eq!(id, 1);

    let allowance = client.get_allowance(&id);
    assert_eq!(allowance.parent, parent);
    assert_eq!(allowance.child, child);
    assert_eq!(allowance.token, token_addr);
    assert_eq!(allowance.amount, 100_000_000);
    assert_eq!(allowance.interval, 2_629_800);
    assert_eq!(allowance.balance, 0);
    assert_eq!(allowance.active, true);
}

#[test]
fn test_create_allowance_increments_id() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id1 = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    let id2 = client.create(&parent, &child, &token_addr, &200_000_000, &2_629_800);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn test_fund_allowance() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);
    let token = token::Client::new(&env, &token_addr);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    let balance_before = token.balance(&parent);

    client.fund(&parent, &id, &500_000_000);

    let allowance = client.get_allowance(&id);
    assert_eq!(allowance.balance, 500_000_000);
    assert_eq!(token.balance(&parent), balance_before - 500_000_000);
    assert_eq!(token.balance(&contract_id), 500_000_000);
}

#[test]
fn test_release_allowance() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);
    let token = token::Client::new(&env, &token_addr);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    client.fund(&parent, &id, &500_000_000);

    let child_balance_before = token.balance(&child);

    env.ledger().set_timestamp(2_629_800 + 1);

    let released = client.release(&id);
    assert_eq!(released, 100_000_000);

    let allowance = client.get_allowance(&id);
    assert_eq!(allowance.balance, 400_000_000);
    assert_eq!(allowance.last_release, 2_629_800 + 1);
    assert_eq!(allowance.next_release, 2_629_800 + 1 + 2_629_800);
    assert_eq!(token.balance(&child), child_balance_before + 100_000_000);
}

#[test]
fn test_multiple_releases() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);
    let _token = token::Client::new(&env, &token_addr);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    client.fund(&parent, &id, &500_000_000);

    env.ledger().set_timestamp(2_629_800 + 1);
    client.release(&id);

    env.ledger().set_timestamp(2_629_800 * 2 + 1);
    client.release(&id);

    let allowance = client.get_allowance(&id);
    assert_eq!(allowance.balance, 300_000_000);
    assert_eq!(allowance.last_release, 2_629_800 * 2 + 1);
}

#[test]
#[should_panic(expected = "release too early")]
fn test_release_too_early() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    client.fund(&parent, &id, &500_000_000);

    // Try releasing immediately (next_release is now = 0)
    client.release(&id);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_release_insufficient_balance() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    // Fund with less than one release amount
    client.fund(&parent, &id, &50_000_000);

    env.ledger().set_timestamp(2_629_800 + 1);
    client.release(&id);
}

#[test]
fn test_cancel_allowance_with_refund() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);
    let token = token::Client::new(&env, &token_addr);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    client.fund(&parent, &id, &500_000_000);

    let parent_balance_before = token.balance(&parent);
    let contract_balance_before = token.balance(&contract_id);

    client.cancel(&parent, &id);

    let allowance = client.get_allowance(&id);
    assert_eq!(allowance.active, false);
    assert_eq!(allowance.balance, 0);

    assert_eq!(token.balance(&parent), parent_balance_before + 500_000_000);
    assert_eq!(
        token.balance(&contract_id),
        contract_balance_before - 500_000_000
    );
}

#[test]
fn test_cancel_already_inactive() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    client.cancel(&parent, &id);
    client.cancel(&parent, &id);
}

#[test]
fn test_parent_allowances_list() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id1 = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    let id2 = client.create(&parent, &child, &token_addr, &200_000_000, &2_629_800);

    let ids = client.get_parent_allowances(&parent);
    assert_eq!(ids.len(), 2);
    assert_eq!(ids.get(0).unwrap(), id1);
    assert_eq!(ids.get(1).unwrap(), id2);
}

#[test]
fn test_child_allowances_list() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);

    let parent2 = Address::generate(&env);
    client.create(&parent2, &child, &token_addr, &200_000_000, &2_629_800);

    let ids = client.get_child_allowances(&child);
    assert_eq!(ids.len(), 2);
}

#[test]
fn test_release_history() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);
    let _token = token::Client::new(&env, &token_addr);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    client.fund(&parent, &id, &500_000_000);

    env.ledger().set_timestamp(2_629_800 + 1);
    client.release(&id);

    env.ledger().set_timestamp(2_629_800 * 2 + 1);
    client.release(&id);

    let history = client.get_release_history(&id);
    assert_eq!(history.len(), 2);

    let first = history.get(0).unwrap();
    assert_eq!(first.amount, 100_000_000);
    assert_eq!(first.timestamp, 2_629_800 + 1);

    let second = history.get(1).unwrap();
    assert_eq!(second.amount, 100_000_000);
    assert_eq!(second.timestamp, 2_629_800 * 2 + 1);
}

#[test]
fn test_empty_allowance_list() {
    let (env, _token_addr, _parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let ids = client.get_child_allowances(&child);
    assert_eq!(ids.len(), 0);
}

#[test]
fn test_empty_history() {
    let (env, token_addr, parent, child) = setup();
    let contract_id = env.register(AllowanceContract, ());
    let client = AllowanceContractClient::new(&env, &contract_id);

    let id = client.create(&parent, &child, &token_addr, &100_000_000, &2_629_800);
    let history = client.get_release_history(&id);
    assert_eq!(history.len(), 0);
}
