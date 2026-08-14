# QuantumVest Blockchain

Truffle project for the QuantumVest smart contract suite.

## Setup

```bash
npm install
cp .env.example .env   # fill in MNEMONIC only if deploying to bsc_testnet
```

## Compile

```bash
npm run compile
```

Solidity is resolved from the locally installed `solc` npm package (pinned
to an exact version) rather than fetched from solc-bin at compile time, so
this works in offline/network-restricted environments too.

## Test

```bash
# start a local chain in one terminal
npx ganache --port 8545

# then, in another terminal
npm test
```

## Migrate

```bash
npm run migrate -- --network development
```

`bsc_testnet` is also configured; deploying to it requires `MNEMONIC` (and
optionally `BSC_TESTNET_RPC_URL`) in `.env`.

## Backend integration

The Flask backend (`../backend`) connects to these contracts through
`app/services/blockchain.py` and exposes them at `/api/v1/blockchain/*`.
It resolves deployed addresses straight out of this project's build
artifacts (`build/contracts/*.json`), keyed by network id - so after
`npm run migrate`, no manual address configuration is needed for the
backend to find the right deployment. See `../backend/.env.example` and
`../README.md` for the full setup, and `../docker-compose.yml`'s
`blockchain` profile for the one-command version (ganache + migration +
backend wired together automatically via a shared volume).

## Layout

- `contracts/DataTracking.sol` — on-chain market data ticker log.
- `contracts/TrendAnalysis.sol` — Chainlink price feed reader / moving average.
- `contracts/QuantumVestToken.sol` — ERC20 with compliance/blacklist/vesting controls.
- `contracts/PortfolioManager.sol` — user portfolios and supported-asset accounting.
- `contracts/QuantumVestStaking.sol` — multi-pool staking and rewards.
- `contracts/QuantumVestGovernance.sol` — token-weighted proposals and voting.
- `contracts/QuantumVestOracle.sol` — on-chain price registry with staleness/confidence guards.
- `contracts/Migrations.sol` — Truffle's migration tracker.
- `contracts/mocks/` — `MockV3Aggregator` and `MockERC20`, used only by the test suite.

## Notable fixes made to this project

- Added `package.json`/dependency management; nothing here compiled before
  since `@openzeppelin/contracts` and `@chainlink/contracts` were never
  installed anywhere.
- `TrendAnalysis.sol` called `priceFeed.latestRound()`, which doesn't exist
  on `AggregatorV3Interface` — this was a compile error. Replaced with
  `latestRoundData()` plus underflow/zero-window guards.
- The five contracts formerly bundled in a single `smart_contracts.sol` at
  the project root were never actually compiled by Truffle, since they
  lived outside `contracts/` (Truffle's default build path). Split into
  one file per contract inside `contracts/`.
- `truffle-config.js` referenced `HDWalletProvider`/`mnemonic` without ever
  requiring or defining them. Now loads the mnemonic from `.env` via
  `dotenv` and only constructs the provider on demand.
- `migrations/1_initial_migration.js` was empty and there was no
  `Migrations.sol` for it to deploy. Added both.
- The test directory was named `tests/`; Truffle's default is `test/`, so
  `truffle test` was silently running zero tests. Renamed, and added full
  coverage for every contract (47 tests total).
- `PortfolioManager`/`QuantumVestStaking` used raw `transfer`/`transferFrom`
  without checking return values; switched to OpenZeppelin's `SafeERC20`.
- `QuantumVestGovernance.castVote` didn't validate the `support` parameter,
  so an out-of-range value silently discarded the caller's vote. Added
  validation.
- `QuantumVestToken`'s vesting schedule was recorded but never enforced on
  transfers. Wired it into `_beforeTokenTransfer`.
- The deployment migration hardcoded an Ethereum Mainnet Chainlink feed
  address regardless of target network. Deployment now resolves the feed
  per-network (with an env override), falling back to a local
  `MockV3Aggregator` when no address is known for the network.
- The backend previously had no connection to this project at all (a
  `blockchain_service.py` was referenced in the top-level README's
  architecture diagram but never existed). Added `app/services/
blockchain.py`, `/api/v1/blockchain/*` routes, and Docker Compose wiring
  (see "Backend integration" above).
