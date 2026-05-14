# AI Agent Escrow - Stupidly Simple Docs

## Network

Production network: Base Mainnet.

- Chain ID: `8453`
- RPC: `https://mainnet.base.org`
- Gas token: `ETH`
- Explorer: `https://basescan.org`
- Contract address: `0xc2a7524864d1998454EB6CF09242B9D33257F6Bf`
- Verified code: `https://basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf#code`

Deployment metadata:

```text
deployments/base-mainnet.json
```

Base Sepolia is available only as a test environment:

```text
deployments/base-sepolia.json
```

## Cara Kerja

1. Buyer AI bikin order.
2. Buyer AI lock ETH ke smart contract.
3. Kalau barang/jasa benar, Buyer AI panggil `release`.
4. Seller mendapat saldo pending 99.5%.
5. Fee wallet pemilik protokol mendapat saldo pending 0.5%.
6. Kalau seller gagal/menipu, Buyer AI panggil `dispute`.
7. Saat dispute, 100% dana dikirim ke dead wallet.
8. Kalau buyer diam sampai deadline, siapa pun boleh panggil `claimTimeout`.
9. Saat timeout, Seller mendapat saldo pending 99.5% dan fee wallet mendapat saldo pending 0.5%.
10. Seller dan fee wallet memanggil `withdraw()` untuk menarik dana masing-masing.

Tidak ada keeper khusus dan tidak ada minimal durasi. Kalau user set escrow 1 detik, itu keputusan user.

## Payload Create Escrow

```json
{
  "seller": "0xSellerWallet",
  "amountWei": "10000000000000000",
  "durationSeconds": 3600,
  "orderId": "ord_1778718000_abcd1234",
  "agreementHash": "0x32_bytes_hash_of_order_payload_unik"
}
```

Call:

```solidity
createEscrow(address seller, uint64 durationSeconds, bytes32 agreementHash)
```

Native ETH dikirim sebagai `msg.value`. `agreementHash` wajib unik dan tidak boleh `0x00...00`.

## Payload Release

```json
{
  "escrowId": "1",
  "action": "release"
}
```

Call:

```solidity
release(uint256 escrowId)
```

Hanya buyer asli yang boleh call. Dana belum masuk wallet seller/fee; saldo masuk ke `pendingWithdrawals`.

## Payload Dispute / Burn

```json
{
  "escrowId": "1",
  "action": "dispute"
}
```

Call:

```solidity
dispute(uint256 escrowId)
```

Hanya buyer asli yang boleh call sebelum deadline.

## Payload Timeout

```json
{
  "escrowId": "1",
  "action": "timeout"
}
```

Call:

```solidity
claimTimeout(uint256 escrowId)
```

Siapa pun boleh call setelah deadline. Dana belum masuk wallet seller/fee; saldo masuk ke `pendingWithdrawals`.

## Payload Withdraw

```json
{
  "action": "withdraw"
}
```

Call:

```solidity
withdraw()
```

Caller menarik `pendingWithdrawals[caller]`. Fee developer bersifat kumulatif; developer tidak perlu withdraw satu-satu per transaksi.

## Deploy ke Base Mainnet

1. Buat file `.env` dari `.env.example`.
2. Isi:

```text
DEPLOYER_PRIVATE_KEY=0x...
FEE_WALLET=0x...
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ETHERSCAN_API_KEY=...
```

3. Pastikan deployer punya ETH di Base Mainnet.
4. Jalankan:

```powershell
cd C:\Users\ASUS\ai-agent-escrow-gateway
npm run deploy:base-mainnet
```

## Python Copy-Paste SDK

File:

```text
sdk/python/ai_agent_escrow.py
```

Run:

```powershell
cd C:\Users\ASUS\ai-agent-escrow-gateway\sdk\python
python -m pip install -r requirements.txt
$env:AI_ESCROW_RPC_URL="https://mainnet.base.org"
$env:AI_ESCROW_CONTRACT_ADDRESS="0xc2a7524864d1998454EB6CF09242B9D33257F6Bf"
$env:AI_ESCROW_CHAIN_ID="8453"
$env:AI_BUYER_PRIVATE_KEY="0xbuyer_agent_private_key"
$env:AI_SELLER_ADDRESS="0xseller_agent_wallet"
$env:AI_ESCROW_AMOUNT_ETH="0.000001"
python .\ai_agent_escrow.py
```

## C++ Copy-Paste Wrapper

File:

```text
sdk/cpp/ai_agent_escrow.cpp
```

Run:

```powershell
cd C:\Users\ASUS\ai-agent-escrow-gateway\sdk\cpp
g++ -std=c++17 .\ai_agent_escrow.cpp -o ai_agent_escrow.exe
$env:AI_ESCROW_RPC_URL="https://mainnet.base.org"
$env:AI_ESCROW_CONTRACT_ADDRESS="0xc2a7524864d1998454EB6CF09242B9D33257F6Bf"
$env:AI_BUYER_PRIVATE_KEY="0xbuyer_agent_private_key"
$env:AI_SELLER_ADDRESS="0xseller_agent_wallet"
$env:AI_ESCROW_AMOUNT_WEI="1000000000000"
.\ai_agent_escrow.exe
```
