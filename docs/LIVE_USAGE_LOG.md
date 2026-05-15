# AI Escrow — Live Protocol Usage Log

Generated: 2026-05-15T08:17:38.443Z

Purpose: this log gives human-readable context for small Base mainnet transactions so people can understand what each escrow tested. It documents real demo/test usage with tiny amounts; it is not meant to fake volume.

Network: Base mainnet
Contract: 0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
Explorer: https://basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
Deployment tx: https://basescan.org/tx/0xcf36bf2e4d01a4697627a6f26327c6e164d9b7fa947288f71c8e7dcbd67e515a

## Gas Top-Ups

- Wallet 3 gas top-up: https://basescan.org/tx/0x9b47bf42f9d4e7e21ff09202145bc66a1a231325729ea09193fce42214f1b3a7
- Wallet 4 gas top-up: https://basescan.org/tx/0x29d1f92f5ad33b0ac3e8843b81350a76264f73fe85caed5e1106c1ab629d351f

## Escrow Scenarios

### Escrow #2 — Agent Research Task
- Buyer: 0x9e25e02Cc41c07d7136B50550ea80C48b01E33e2
- Seller/Agent: 0x029C903f33b29ef2faEa0e6706C80AF32bbF4AE7
- Amount: 0.00002 ETH
- Protocol fee at 50 bps: 0.0000001 ETH
- Seller amount before withdraw gas: 0.0000199 ETH
- Agreement hash: 0x90204b13237bb78ccbfafcdcf002b914f109af87c3e325afc48866cf9d614b87
- Task narrative: Buyer asks an AI/research agent to summarize why autonomous agents need escrow for paid tasks.
- Success condition: Research summary delivered; buyer releases escrow.
- Why it matters: Proves the basic happy path: create escrow -> task delivered -> release -> seller withdraw.
- Final status: Released (status enum 2)
- Tx links:
  - Create/Fund: https://basescan.org/tx/0xd604827ff69cb503809f9210989d0e723085745409d7a121ca9925de48867937
  - Release: https://basescan.org/tx/0x4714f4f3c346e404c087a00a61c3c33d584152313e4edc9c3f6f5afab0aa67bf
  - Seller withdraw: https://basescan.org/tx/0x87a2a083f46f2c21b50b27f0daf22c0a9a121ae1b617f661cba9e1b2e98a3ab4

### Escrow #3 — Smart Contract Review Micro-Bounty Prep
- Buyer: 0x9e25e02Cc41c07d7136B50550ea80C48b01E33e2
- Seller/Agent: 0x029C903f33b29ef2faEa0e6706C80AF32bbF4AE7
- Amount: 0.00002 ETH
- Protocol fee at 50 bps: 0.0000001 ETH
- Seller amount before withdraw gas: 0.0000199 ETH
- Agreement hash: 0xfde786d835a89ae942cddf1cb715cb39206a0036daaf48de35ee4d4c516af923
- Task narrative: Buyer reserves a tiny escrow slot for contract/UI review feedback before inviting an external builder bounty.
- Success condition: Review checklist prepared and escrow flow proven for future external reviewer payout.
- Why it matters: Shows the protocol can pay for builder feedback through the escrow path.
- Final status: Released (status enum 2)
- Tx links:
  - Create/Fund: https://basescan.org/tx/0x30fe0c04cfccd517049a9e51e1b8f7c5c9cd32cecaf8a1c7d7ec50d631839074
  - Release: https://basescan.org/tx/0x1dd3355a229b563f27d792c4c912aaaef28275e19c48df710e69e5e1aee12c10
  - Seller withdraw: https://basescan.org/tx/0xa7c4ad1613ea964a5e226f1934dbb4add0243f4abc217a836179c60e082999a8

### Escrow #4 — Discord Outreach Task
- Buyer: 0x9e25e02Cc41c07d7136B50550ea80C48b01E33e2
- Seller/Agent: 0x3749f79D6798D838C1f192405870442C3a58be60
- Amount: 0.00002 ETH
- Protocol fee at 50 bps: 0.0000001 ETH
- Seller amount before withdraw gas: 0.0000199 ETH
- Agreement hash: 0x23b9467b476b6c1afafffd9aa2c75580e94f603bcdb0fda451b1905e78c0ad6a
- Task narrative: Agent drafts transparent outreach copy introducing AI Escrow to a developer/agent community.
- Success condition: Outreach draft delivered; buyer releases escrow.
- Why it matters: Demonstrates escrow for agentic business operations and outreach work.
- Final status: Released (status enum 2)
- Tx links:
  - Create/Fund: https://basescan.org/tx/0x38dcb218b2f3366aebd7096e36d6e2e5959441e76b6c659382e7c3c7a464b517
  - Release: https://basescan.org/tx/0x6a3d9fee25449a6608f36fff8285a64f4d2664ad023f32b97866880c1b206210
  - Seller withdraw: https://basescan.org/tx/0x9b6ef1a0c77f04ad1be6d758dc40aaba0c512aa5ae6e76d3195bfb6bbbe6751a

### Escrow #5 — Timeout / Liveness Test
- Buyer: 0x9e25e02Cc41c07d7136B50550ea80C48b01E33e2
- Seller/Agent: 0x3749f79D6798D838C1f192405870442C3a58be60
- Amount: 0.00001 ETH
- Protocol fee at 50 bps: 0.00000005 ETH
- Seller amount before withdraw gas: 0.00000995 ETH
- Agreement hash: 0xcf15ac0d22be51072724ee79554213a5f363937f49cc928f7ba34910b146c7fc
- Task narrative: A short-duration task is intentionally left unreleased to test timeout behavior.
- Success condition: After deadline, timeout path releases funds to seller according to contract rules.
- Why it matters: Shows the team tests failure/liveness behavior, not only perfect demos.
- Final status: TimedOut (status enum 4)
- Tx links:
  - Create/Fund: https://basescan.org/tx/0xd366db051a52d1b3a3a08949bd428e3a201a76de0d7737220f8d594aba6bc93a
  - Claim timeout: https://basescan.org/tx/0x0b5b2f7a5564ebd1e3e74128b987dd90232c3117088ecd3f57bfa868bf3f5013
  - Seller withdraw: https://basescan.org/tx/0x2de7fc6ca1b65fb19c8ae9d3da974b99eaf864da64b9f2b24c8ddb8180e5c5e5

### Escrow #6 — Dispute / Ambiguous Delivery Test
- Buyer: 0x9e25e02Cc41c07d7136B50550ea80C48b01E33e2
- Seller/Agent: 0x05426999984ED6076883b1c895bd2021F6D002a0
- Amount: 0.00001 ETH
- Protocol fee at 50 bps: 0.00000005 ETH
- Seller amount before withdraw gas: 0.00000995 ETH
- Agreement hash: 0xe2d0ca188e9ba0465c57a368786f0141d1b75957036a64596ef07b25f6605667
- Task narrative: Seller submits an intentionally incomplete/ambiguous result to test the v1 dispute burn path.
- Success condition: Buyer disputes before deadline; contract sends the tiny escrow amount to the configured dead wallet.
- Why it matters: Documents an honest edge case and confirms the current v1 dispute behavior.
- Final status: Burned (status enum 3)
- Tx links:
  - Create/Fund: https://basescan.org/tx/0x586c82254ddec143561ab06716fbeba2c90cd43e98ac50ccdfea02c4e7dd1b63
  - Dispute/Burn: https://basescan.org/tx/0x71405036472eed6d4cc1b8abbaeff078321cf91c8639b895619165cd31752e3d

## Public Update Template

AI Escrow usage log is live.

We are not trying to fake volume. We are documenting small real protocol interactions on Base: research tasks, contract-review prep, outreach tasks, timeout tests, and dispute/edge-case tests.

Goal: make autonomous-agent payments more transparent and safer with escrowed execution.

Live contract: https://basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf
