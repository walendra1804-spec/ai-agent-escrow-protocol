# AI Agent Escrow Gateway

Base-layer escrow infrastructure for autonomous AI agents. No UI, no custody, no negotiation layer. The protocol exposes a minimal smart contract surface for locking funds, releasing value, burning disputed value, and withdrawing accumulated balances.

## First Principles: Pay or Burn

The protocol uses a deliberately hard settlement rule:

- Pay: if the buyer agent accepts the result, funds are released to the seller through `pendingWithdrawals`.
- Burn: if the buyer agent disputes before timeout, the full escrow amount is sent to the dead wallet.
- Timeout: if the buyer agent stays silent until the agreed deadline passes, anyone may finalize the escrow and release funds to the seller.

This is a base protocol, not a consumer arbitration product. It does not protect users from bad duration choices, weak off-chain agreements, or poor counterparty selection. It only enforces the rules committed on-chain.

## Mainnet Deployment

Network: Base Mainnet

Contract:

```text
0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
```

Verified source:

```text
https://basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf#code
```

Deployment transaction:

```text
0xcf36bf2e4d01a4697627a6f26327c6e164d9b7fa947288f71c8e7dcbd67e515a
```

Fee wallet:

```text
0x9f87Eae58dDB89281FDF794CD3Bd13D3e2457a99
```

Platform fee: `0.5%` on `release` and `timeout`.

## Testnet Deployment

Base Sepolia remains available for integration tests:

```text
https://sepolia.basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
```

## Core Contract Flow

- `createEscrow(seller, durationSeconds, agreementHash)` locks native ETH.
- `release(escrowId)` records seller and platform fee balances as pending withdrawals.
- `dispute(escrowId)` burns the full escrow amount to `0x000000000000000000000000000000000000dEaD`.
- `claimTimeout(escrowId)` is manual and permissionless after the deadline.
- `withdraw()` lets each recipient pull their accumulated pending balance.

Settlement uses pull-payment:

```solidity
pendingWithdrawals[recipient] += amount;
```

Recipients can withdraw accumulated balances in a single call. Fee withdrawals are cumulative, not per-transaction.

## Quick Start

Install and test locally:

```bash
npm install
npm run compile
npm test
npm run simulate:all
```

Deploy to Base Mainnet:

```bash
BASE_MAINNET_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=0x...
FEE_WALLET=0x...

npm run deploy:base-mainnet
```

Mainnet deployment metadata is written to:

```text
deployments/base-mainnet.json
```

Run a Base Sepolia live test:

```bash
set LIVE_ESCROW_AMOUNT_ETH=0.000001
npm run live:happy:base-sepolia
```

Withdraw pending balance for the wallet configured in `.env`:

```bash
npm run live:withdraw:base-sepolia
```

## Environment

Create a local environment file:

```bash
copy .env.example .env
```

Required for deploy/live scripts:

```text
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...
FEE_WALLET=0x...
ETHERSCAN_API_KEY=...
```

Never commit `.env`.

## Python SDK Quick Start

Install dependencies:

```bash
cd sdk/python
python -m pip install -r requirements.txt
```

Set environment variables for Base Mainnet:

```bash
set AI_ESCROW_RPC_URL=https://mainnet.base.org
set AI_ESCROW_CONTRACT_ADDRESS=0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
set AI_BUYER_PRIVATE_KEY=0x_buyer_agent_private_key
set AI_SELLER_ADDRESS=0x_seller_agent_wallet
set AI_ESCROW_CHAIN_ID=8453
set AI_ESCROW_AMOUNT_ETH=0.000001
set AI_ESCROW_DURATION_SECONDS=3600
```

Create an order and lock funds:

```bash
python ai_agent_escrow.py
```

Minimal Python usage:

```python
from ai_agent_escrow import AIAgentEscrowClient

client = AIAgentEscrowClient.from_env()

order = client.create_order_and_lock_funds(
    seller_address="0xSellerWallet",
    amount_eth="0.000001",
    duration_seconds=3600,
    metadata={"job": "agent-service-demo"},
)

print(order)
```

Withdraw pending balance:

```python
print(client.pending_withdrawal())
print(client.withdraw())
```

## Repository Layout

```text
contracts/                 Solidity contracts
contracts/test/            test helper contracts
deployments/               public deployment metadata
docs/                      API and simple user docs
scripts/                   local, deployment, and live network scripts
sdk/cpp/                   C++ wrapper using Foundry cast
sdk/python/                Python SDK wrapper
test/                      Hardhat test suite
```

## Verification

The Base Mainnet contract is verified on Basescan. To verify again after redeploying:

```bash
set ETHERSCAN_API_KEY=your_etherscan_v2_api_key

npm run hh -- verify --network baseMainnet ^
  <CONTRACT_ADDRESS> ^
  <INITIAL_OWNER> ^
  <FEE_WALLET> ^
  0x000000000000000000000000000000000000dEaD
```

## Security Notes

- `agreementHash` must be unique and non-zero.
- There is no minimum duration by design.
- Timeout is manual and permissionless.
- Fee withdrawals are cumulative, not per-transaction.
- The contract is verified on Base Mainnet. Independent audit is still recommended before routing significant value through the protocol.
