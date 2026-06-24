#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, token, Address, Env, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Allowance {
    pub parent: Address,
    pub child: Address,
    pub token: Address,
    pub amount: i128,
    pub interval: u64,
    pub last_release: u64,
    pub next_release: u64,
    pub balance: i128,
    pub active: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct ReleaseRecord {
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Allowance(u64),
    ParentAllowances(Address),
    ChildAllowances(Address),
    AllowanceHistory(u64),
    NextId,
}

#[contractevent(data_format = "vec")]
pub struct CreateEvent {
    #[topic]
    parent: Address,
    #[topic]
    child: Address,
    token: Address,
    amount: i128,
    interval: u64,
    id: u64,
}

#[contractevent(data_format = "vec")]
pub struct FundEvent {
    #[topic]
    allowance_id: u64,
    #[topic]
    from: Address,
    amount: i128,
}

#[contractevent(data_format = "vec")]
pub struct ReleaseEvent {
    #[topic]
    allowance_id: u64,
    #[topic]
    child: Address,
    amount: i128,
}

#[contractevent(data_format = "single-value")]
pub struct CancelEvent {
    #[topic]
    allowance_id: u64,
    refund: i128,
}

#[contract]
pub struct AllowanceContract;

#[contractimpl]
impl AllowanceContract {
    pub fn create(
        env: Env,
        parent: Address,
        child: Address,
        token: Address,
        amount: i128,
        interval: u64,
    ) -> u64 {
        parent.require_auth();
        assert!(amount > 0, "amount must be > 0");
        assert!(interval > 0, "interval must be > 0");

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1);
        let now = env.ledger().timestamp();

        let allowance = Allowance {
            parent: parent.clone(),
            child: child.clone(),
            token: token.clone(),
            amount,
            interval,
            last_release: 0,
            next_release: now + interval,
            balance: 0,
            active: true,
            created_at: now,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Allowance(id), &allowance);

        let mut parent_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::ParentAllowances(parent.clone()))
            .unwrap_or(Vec::new(&env));
        parent_ids.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::ParentAllowances(parent.clone()), &parent_ids);

        let mut child_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::ChildAllowances(child.clone()))
            .unwrap_or(Vec::new(&env));
        child_ids.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::ChildAllowances(child.clone()), &child_ids);

        env.storage()
            .instance()
            .set(&DataKey::NextId, &(id + 1));

        CreateEvent {
            parent,
            child,
            token,
            amount,
            interval,
            id,
        }
        .publish(&env);

        id
    }

    pub fn fund(env: Env, from: Address, allowance_id: u64, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be > 0");

        let key = DataKey::Allowance(allowance_id);
        let mut allowance: Allowance = env
            .storage()
            .persistent()
            .get(&key)
            .expect("allowance not found");
        assert!(allowance.parent == from, "not authorized");
        assert!(allowance.active, "allowance is not active");

        let token_client = token::Client::new(&env, &allowance.token);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        allowance.balance += amount;
        env.storage().persistent().set(&key, &allowance);

        FundEvent {
            allowance_id,
            from,
            amount,
        }
        .publish(&env);
    }

    pub fn release(env: Env, allowance_id: u64) -> i128 {
        let key = DataKey::Allowance(allowance_id);
        let mut allowance: Allowance = env
            .storage()
            .persistent()
            .get(&key)
            .expect("allowance not found");

        assert!(allowance.active, "allowance is not active");
        let now = env.ledger().timestamp();
        assert!(now >= allowance.next_release, "release too early");
        assert!(
            allowance.balance >= allowance.amount,
            "insufficient balance"
        );

        let token_client = token::Client::new(&env, &allowance.token);
        token_client.transfer(
            &env.current_contract_address(),
            &allowance.child,
            &allowance.amount,
        );

        let released = allowance.amount;
        allowance.balance -= released;
        allowance.last_release = now;
        allowance.next_release = now + allowance.interval;
        env.storage().persistent().set(&key, &allowance);

        let mut history: Vec<ReleaseRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::AllowanceHistory(allowance_id))
            .unwrap_or(Vec::new(&env));
        history.push_back(ReleaseRecord {
            amount: released,
            timestamp: now,
        });
        env.storage()
            .persistent()
            .set(&DataKey::AllowanceHistory(allowance_id), &history);

        ReleaseEvent {
            allowance_id,
            child: allowance.child,
            amount: released,
        }
        .publish(&env);

        released
    }

    pub fn cancel(env: Env, caller: Address, allowance_id: u64) {
        caller.require_auth();

        let key = DataKey::Allowance(allowance_id);
        let mut allowance: Allowance = env
            .storage()
            .persistent()
            .get(&key)
            .expect("allowance not found");
        assert!(allowance.parent == caller, "not authorized");
        allowance.active = false;

        let refund = allowance.balance;
        if refund > 0 {
            let token_client = token::Client::new(&env, &allowance.token);
            token_client.transfer(
                &env.current_contract_address(),
                &allowance.parent,
                &refund,
            );
            allowance.balance = 0;
        }

        env.storage().persistent().set(&key, &allowance);

        CancelEvent {
            allowance_id,
            refund,
        }
        .publish(&env);
    }

    pub fn get_allowance(env: Env, allowance_id: u64) -> Allowance {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(allowance_id))
            .expect("allowance not found")
    }

    pub fn get_parent_allowances(env: Env, parent: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::ParentAllowances(parent))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_child_allowances(env: Env, child: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::ChildAllowances(child))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_release_history(env: Env, allowance_id: u64) -> Vec<ReleaseRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::AllowanceHistory(allowance_id))
            .unwrap_or(Vec::new(&env))
    }
}

mod test;
