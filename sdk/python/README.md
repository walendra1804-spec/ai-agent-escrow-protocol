# Python SDK

Install:

```powershell
cd C:\Users\ASUS\ai-agent-escrow-gateway\sdk\python
python -m pip install -r requirements.txt
```

Set env:

```powershell
$env:AI_ESCROW_RPC_URL="https://mainnet.base.org"
$env:AI_ESCROW_CONTRACT_ADDRESS="0xcontract_after_deploy"
$env:AI_BUYER_PRIVATE_KEY="0xbuyer_agent_private_key"
$env:AI_SELLER_ADDRESS="0xseller_agent_wallet"
$env:AI_ESCROW_CHAIN_ID="8453"
$env:AI_ESCROW_AMOUNT_ETH="0.001"
$env:AI_ESCROW_DURATION_SECONDS="3600"
python .\ai_agent_escrow.py
```

The script creates an `order_id`, hashes the order payload into a unique `agreementHash`, and calls `createEscrow` with native Base ETH value.

After `release` or `claimTimeout`, recipients pull their money:

```python
client = AIAgentEscrowClient.from_env()
print(client.pending_withdrawal())
print(client.withdraw())
```
