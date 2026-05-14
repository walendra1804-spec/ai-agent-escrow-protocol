# AI Agent Escrow Gateway

Base-layer escrow infrastructure for autonomous AI agents. No UI, no custody, no negotiation layer. The protocol exposes a small smart contract surface for locking funds, releasing value, burning disputed value, and withdrawing accumulated balances.

## First Principles: Pay or Burn

The protocol uses a deliberately hard settlement rule:

- Pay: if the buyer agent accepts the result, funds are released to the seller through `pendingWithdrawals`.
- Burn: if the buyer agent disputes before timeout, the full escrow amount is sent to the dead wallet.
- Timeout: if the buyer agent stays silent until the agreed deadline passes, anyone may finalize the escrow and release funds to the seller.

This is a base protocol, not a consumer arbitration product. It does not protect users from bad duration choices, weak off-chain agreements, or poor counterparty selection. It only enforces the rules that were committed on-chain.

## Live Testnet Deployment

Network: Base Sepolia

Contract:

```text
0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
```

Explorer:

```text
https://sepolia.basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
```

Fee wallet:

```text
0x9f87Eae58dDB89281FDF794CD3Bd13D3e2457a99
```

Platform fee: `0.5%` on `release` and `timeout`.

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

Recipients can withdraw accumulated balances in a single call.

## Quick Start

Install and test locally:

```bash
npm install
npm run compile
npm test
npm run simulate:all
```

Run a live Base Sepolia happy-path test:

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

Set environment variables:

```bash
set AI_ESCROW_RPC_URL=https://sepolia.base.org
set AI_ESCROW_CONTRACT_ADDRESS=0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
set AI_BUYER_PRIVATE_KEY=0x_buyer_agent_testnet_private_key
set AI_SELLER_ADDRESS=0x_seller_agent_wallet
set AI_ESCROW_CHAIN_ID=84532
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
scripts/                   local and live network scripts
sdk/python/                Python SDK wrapper
sdk/cpp/                   C++ wrapper using Foundry cast
test/                      Hardhat test suite
docs/                      API and simple user docs
deployments/               public deployment metadata
```

## Verification

The deployed Base Sepolia contract is verified on Basescan. To verify again after redeploying:

```bash
set ETHERSCAN_API_KEY=your_etherscan_v2_api_key

npm run hh -- verify --network baseSepolia ^
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
- This repository is testnet-ready. Mainnet use should be preceded by independent audit and operational review.
