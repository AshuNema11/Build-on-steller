# PocketAllowance — Architecture & Deployment Notes

## Architecture

### Smart Contract (`contract/contracts/contract/src/lib.rs`)

Soroban contract providing allowance management on Stellar:

- **Data Keys**: `Allowance(u64)`, `ParentAllowances(Address)`, `ChildAllowances(Address)`, `AllowanceHistory(u64)`, `NextId`
- **Core Functions**:
  - `create(parent, child, token, amount, interval)` → Creates a new allowance (ID auto-increments)
  - `fund(from, allowance_id, amount)` → Deposit tokens into the contract for an allowance
  - `release(allowance_id)` → Anyone-triggerable: releases XLM to child if time has elapsed
  - `cancel(caller, allowance_id)` → Parent cancels, balance refunded automatically
  - `get_allowance`, `get_parent_allowances`, `get_child_allowances`, `get_release_history` — Read-only queries
- **Events**: Uses `#[contractevent]` for Create, Fund, Release, Cancel events

### Test Suite (`contract/contracts/contract/src/test.rs`)

14 tests covering: create, increment IDs, fund, release, release too early, insufficient balance, multiple releases, cancel with refund, cancel inactive, parent/child lists, release history, empty list, empty history.

### Frontend (`client/`)

- **Next.js 16** (App Router) + **Tailwind v4** + **@stellar/stellar-sdk v16** + **@stellar/freighter-api v6**
- **hooks/wallet.ts** — Freighter connection management with state
- **hooks/contract.ts** — Contract interaction helpers (readContract, callContract, typed allowance functions)
- **components/DashboardView.tsx** — Main dashboard with stats, allowance cards, fund modal
- **components/CreateAllowance.tsx** — Form to create new allowances
- **components/AllowanceCard.tsx** — Individual allowance display with fund/release/cancel actions
- **components/TransactionHistory.tsx** — Release history table
- **components/Navbar.tsx** — Top nav with wallet connection button
- **app/api/cron/release/route.ts** — Keeper endpoint scaffold for automated releases

## Deployment Instructions

### 1. Build & Deploy Contract

```bash
cd ~/project/contract
stellar contract build
stellar keys generate dev --network testnet --fund
stellar contract deploy \
  --wasm target/wasm32v1-none/release/allowance_contract.wasm \
  --source-account dev --network testnet
```

Save the returned contract address (starts with `C...`).

### 2. Fund the Deployer & Wrap XLM

The contract works with any SEP-41 token. For XLM, use the wrapped XLM token. On Testnet, get the wrapped XLM contract address:
```bash
# The native XLM asset contract on Testnet
# You can use: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

### 3. Configure Frontend

```bash
cd ~/project/client
# Edit .env.local:
#   NEXT_PUBLIC_CONTRACT_ADDRESS=<your-deployed-contract-address>
#   KEEPER_SECRET_KEY=<stellar-secret-for-cron-account>
#   CRON_SECRET=<random-secret>
```

### 4. Run Frontend

```bash
cd ~/project/client
bun run dev
```

### 5. Automated Releases (Keeper)

The `/api/cron/release` endpoint is a scaffold for automated allowance releases.
Set up a cron job (e.g., every hour):
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://your-site.com/api/cron/release
```

For production, extend the keeper to:
1. Maintain an index of allowance IDs in a database
2. Query contract events to find due allowances
3. Batch sign and submit release transactions
4. Use a proper key management solution for the keeper account

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address (C...) |
| `KEEPER_SECRET_KEY` | Stellar secret key for the keeper account |
| `CRON_SECRET` | Auth secret for cron endpoint |
| `NEXT_PUBLIC_STELLAR_NETWORK` | "testnet" or "pubnet" |
| `NEXT_PUBLIC_RPC_URL` | Soroban RPC URL |

## Key Design Decisions

1. **Deposit-first model**: Parents pre-deposit tokens into the contract. The contract holds the balance and releases on schedule.
2. **Permissionless releases**: Anyone can call `release()` — enables keeper/cron automation.
3. **Refund on cancel**: When parent cancels, remaining balance is automatically transferred back.
4. **Any SEP-41 token**: The contract works with any token (USDC, wrapped XLM, etc.) passed at creation.
5. **Interval-based scheduling**: First release is `create_time + interval`, subsequent releases are `last_release + interval`.

## Files Created/Modified

- `contract/contracts/contract/src/lib.rs` — Smart contract (fixed events, clones)
- `contract/contracts/contract/src/test.rs` — Full test suite (fixed token API)
- `client/src/hooks/wallet.ts` — Freighter wallet hook
- `client/src/hooks/contract.ts` — Contract interaction hooks
- `client/src/lib/utils.ts` — Shared utilities
- `client/src/components/Navbar.tsx` — Navigation bar
- `client/src/components/DashboardView.tsx` — Main dashboard
- `client/src/components/CreateAllowance.tsx` — Allowance creation form
- `client/src/components/AllowanceCard.tsx` — Allowance display card
- `client/src/components/TransactionHistory.tsx` — History table
- `client/src/app/page.tsx` — Entry page
- `client/src/app/layout.tsx` — Root layout
- `client/src/app/globals.css` — Global styles
- `client/src/app/api/cron/release/route.ts` — Keeper API endpoint
- `client/.env.local` — Environment configuration
- `client/public/favicon.svg` — App favicon
- `lesson.md` — This file
