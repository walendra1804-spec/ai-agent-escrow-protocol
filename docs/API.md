# AI Agent Escrow Gateway API

## Network Choice

Target testnet: Base Sepolia. Alasannya: EVM-compatible, RPC publik sederhana, faucet lebih mudah diakses, biaya rendah, dan tooling developer matang untuk Hardhat, ethers, indexer, dan agent backend.

Local simulation di repo ini memakai Hardhat Network. Asset yang dikunci adalah native coin EVM:

- Hardhat lokal: ETH simulasi
- Base Sepolia: ETH testnet native

## Architecture

Komponen:

- AI Buyer Agent: wallet yang membuat escrow, mengunci dana, lalu memanggil `release` atau `dispute`.
- AI Seller Agent: wallet penerima dana jika transaksi sukses atau timeout.
- Escrow Smart Contract: menyimpan dana, status, deadline, fee, pending withdrawal, dan event.
- Fee Wallet: wallet pemilik infrastruktur. Mendapat saldo pending 0.5% saat `release` dan `timeout`, lalu menariknya dengan `withdraw`.
- Dead Wallet: address burn. Menerima 100% dana saat `dispute`.
- Manual Timeout Caller: siapa pun boleh memanggil `claimTimeout` setelah deadline. Tidak ada keeper khusus di protokol.

State escrow:

- `Funded`: dana terkunci.
- `Released`: buyer menyetujui, seller mendapat pending withdrawal 99.5%, fee wallet mendapat pending withdrawal 0.5%.
- `Burned`: buyer dispute sebelum deadline, 100% dana dikirim ke dead wallet.
- `TimedOut`: deadline lewat, siapa pun memanggil timeout, seller mendapat pending withdrawal 99.5%, fee wallet mendapat pending withdrawal 0.5%.

Catatan timeout: smart contract tidak bisa memanggil dirinya sendiri. Protokol hanya menyediakan fungsi manual permissionless `claimTimeout(escrowId)` setelah `deadline`.

## Contract Methods

### Create Escrow

Locks native coin into the contract. `agreementHash` wajib unik dan tidak boleh `bytes32(0)`.

```solidity
function createEscrow(
    address seller,
    uint64 durationSeconds,
    bytes32 agreementHash
) external payable returns (uint256 escrowId);
```

Parameters:

- `seller`: wallet AI seller.
- `durationSeconds`: durasi escrow sejak block timestamp transaksi dibuat.
- `agreementHash`: hash dokumen/order/spec off-chain. Gunakan `ethers.id("...")` atau hash IPFS/CID/order payload.
- `msg.value`: dana yang dikunci.

Ethers.js:

```js
const tx = await escrow.connect(buyer).createEscrow(
  sellerAddress,
  3600,
  ethers.id("order:123"),
  { value: ethers.parseEther("1") }
);
const receipt = await tx.wait();
```

### Release API

Buyer menyetujui barang/jasa. Kontrak mencatat 0.5% sebagai pending withdrawal fee wallet dan sisanya sebagai pending withdrawal seller.

```solidity
function release(uint256 escrowId) external;
```

Rules:

- Caller harus buyer asli.
- Escrow harus masih `Funded`.
- Fee = `amount * 50 / 10000`.
- Seller pending balance = `amount - fee`.
- Tidak ada push transfer ke seller/fee wallet di fungsi ini.

Ethers.js:

```js
await (await escrow.connect(buyer).release(escrowId)).wait();
```

### Dispute / Burn API

Buyer menolak transaksi sebelum deadline. Semua dana dikirim ke dead wallet.

```solidity
function dispute(uint256 escrowId) external;
```

Rules:

- Caller harus buyer asli.
- Escrow harus masih `Funded`.
- Hanya bisa sebelum deadline.
- Seller dan fee wallet tidak menerima apa pun.

Ethers.js:

```js
await (await escrow.connect(buyer).dispute(escrowId)).wait();
```

### Timeout API

Fallback ketika buyer tidak memanggil `release` atau `dispute` sampai escrow lewat deadline. Dana dicatat sebagai pending withdrawal seller dengan fee 0.5% ke fee wallet.

```solidity
function claimTimeout(uint256 escrowId) external;
```

Rules:

- Caller boleh siapa pun.
- Escrow harus masih `Funded`.
- `block.timestamp` harus lebih besar dari `deadline`.
- Seller pending balance bertambah 99.5%, fee wallet pending balance bertambah 0.5%.
- Tidak ada keeper khusus di protokol. Fungsi ini murni permissionless dan manual.

Ethers.js:

```js
await (await escrow.connect(anyCaller).claimTimeout(escrowId)).wait();
```

### Withdraw API

Seller atau fee wallet menarik saldo pending miliknya sendiri.

```solidity
function withdraw() external;
```

Rules:

- Caller hanya bisa menarik `pendingWithdrawals[msg.sender]`.
- Saldo pending di-zero-kan sebelum native transfer.
- Jika caller adalah smart contract yang menolak native token, withdrawal miliknya sendiri akan gagal, tetapi escrow lain tidak ikut macet.

Ethers.js:

```js
await (await escrow.connect(seller).withdraw()).wait();
await (await escrow.connect(feeWallet).withdraw()).wait();
```

### Pending Balance API

```solidity
function pendingWithdrawals(address account) external view returns (uint256);
function usedAgreementHash(bytes32 agreementHash) external view returns (bool);
```

## Optional REST Gateway Mapping

Jika nanti ingin membuat HTTP API untuk AI agents, endpoint dapat memetakan langsung ke contract call:

```http
POST /v1/escrows
POST /v1/escrows/:escrowId/release
POST /v1/escrows/:escrowId/dispute
POST /v1/escrows/:escrowId/timeout
POST /v1/withdraw
GET  /v1/escrows/:escrowId
```

Gateway sebaiknya tidak custody private key user. Agent buyer/seller tetap sign transaksi sendiri, atau memakai account abstraction/session key dengan policy yang jelas.

## Events

Indexer/agent dapat memantau:

- `EscrowCreated(escrowId, buyer, seller, amount, deadline, agreementHash)`
- `EscrowReleased(escrowId, buyer, seller, amount, sellerAmount, feeAmount, feeWallet)`
- `EscrowBurned(escrowId, buyer, deadWallet, amount)`
- `EscrowTimedOut(escrowId, buyer, seller, amount, sellerAmount, feeAmount, feeWallet)`
- `FeeWalletUpdated(oldFeeWallet, newFeeWallet)`
- `WithdrawalClaimed(account, amount)`

## Safety Notes

- Burn native coin dilakukan dengan transfer ke `0x000000000000000000000000000000000000dEaD`.
- Fee memakai basis points: 50 bps = 0.5%.
- Fee dibulatkan ke bawah oleh integer division. Kontrak menolak nominal terlalu kecil agar fee minimal 1 wei.
- Timeout tetap manual permissionless: siapa pun boleh memanggil `claimTimeout` setelah deadline.
- Tidak ada `MIN_DURATION`; durasi escrow adalah keputusan caller.
- Sebelum mainnet, jalankan test, fuzzing tambahan, dan audit eksternal jika kontrak akan memegang dana nyata.
