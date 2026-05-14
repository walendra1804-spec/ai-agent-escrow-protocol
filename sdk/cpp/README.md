# C++ Wrapper

This is a tiny C++ wrapper around Foundry `cast`. It creates an `orderId`, creates a `bytes32 agreementHash`, and calls `createEscrow`.

Install Foundry first so `cast` exists in PATH:

```powershell
winget install Foundry-rs.Foundry
```

Compile:

```powershell
cd C:\Users\ASUS\ai-agent-escrow-gateway\sdk\cpp
g++ -std=c++17 .\ai_agent_escrow.cpp -o ai_agent_escrow.exe
```

Run:

```powershell
$env:AI_ESCROW_RPC_URL="https://mainnet.base.org"
$env:AI_ESCROW_CONTRACT_ADDRESS="0xcontract_after_deploy"
$env:AI_BUYER_PRIVATE_KEY="0xbuyer_agent_private_key"
$env:AI_SELLER_ADDRESS="0xseller_agent_wallet"
$env:AI_ESCROW_AMOUNT_WEI="10000000000000000"
$env:AI_ESCROW_DURATION_SECONDS="3600"
.\ai_agent_escrow.exe
```

Use dedicated operational keys and never commit secrets.
