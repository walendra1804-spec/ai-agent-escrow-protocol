# AI Agent Escrow - Stupidly Simple Docs

## Network

Testnet yang dipakai: Base Sepolia.

- Chain ID: `84532`
- RPC: `https://sepolia.base.org`
- Gas token: `ETH`
- Explorer: `https://sepolia.basescan.org`
- Contract address: `0xc2a7524864d1998454EB6CF09242B9D33257F6Bf`

Status saat ini: deployed ke Base Sepolia. Explorer: https://sepolia.basescan.org/address/0xc2a7524864d1998454EB6CF09242B9D33257F6Bf

Setelah deploy, alamat kontrak otomatis ditulis ke:

```text
deployments/base-sepolia.json
```

## Cara Kerja

1. Buyer AI bikin order.
2. Buyer AI lock ETH testnet ke smart contract.
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

Ini format data yang AI perlu siapkan sebelum call contract:

```json
{
  "seller": "0xSellerWallet",
  "amountWei": "10000000000000000",
  "durationSeconds": 3600,
  "orderId": "ord_1778718000_abcd1234",
  "agreementHash": "0x32_bytes_hash_of_order_payload_unik"
}
```

Call smart contract:

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

Caller menarik `pendingWithdrawals[caller]`.

## Deploy ke Base Sepolia

1. Buat file `.env` dari `.env.example`.
2. Isi:

```text
DEPLOYER_PRIVATE_KEY=0x...
FEE_WALLET=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

3. Isi deployer dengan test ETH dari faucet Base Sepolia.
4. Jalankan:

```powershell
cd C:\Users\ASUS\ai-agent-escrow-gateway
npm run deploy:base-sepolia
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
$env:AI_ESCROW_CONTRACT_ADDRESS="0xcontract_after_deploy"
$env:AI_BUYER_PRIVATE_KEY="0xbuyer_agent_testnet_private_key"
$env:AI_SELLER_ADDRESS="0xseller_agent_wallet"
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
$env:AI_ESCROW_CONTRACT_ADDRESS="0xcontract_after_deploy"
$env:AI_BUYER_PRIVATE_KEY="0xbuyer_agent_testnet_private_key"
$env:AI_SELLER_ADDRESS="0xseller_agent_wallet"
$env:AI_ESCROW_AMOUNT_WEI="10000000000000000"
.\ai_agent_escrow.exe
```
