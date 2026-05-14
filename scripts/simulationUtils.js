const { ethers, network } = require("hardhat");
const { BuyerAgent } = require("./agents/agentA-buyer");
const { SellerAgent } = require("./agents/agentB-seller");

const DEAD_WALLET = "0x000000000000000000000000000000000000dEaD";
const ZERO_GAS = { gasPrice: 0 };
const DEFAULT_AMOUNT = ethers.parseEther("1");
const DEFAULT_DURATION_SECONDS = 3600;
const AGREEMENT_HASH = ethers.id("ai-agent-order:demo-service:v1");

async function deploySimulation() {
  const [deployer, buyerSigner, sellerSigner, feeSigner, timeoutCallerSigner] = await ethers.getSigners();

  const Escrow = await ethers.getContractFactory("AIAgentEscrow");
  const escrow = await Escrow.deploy(
    await deployer.getAddress(),
    await feeSigner.getAddress(),
    DEAD_WALLET,
    ZERO_GAS
  );
  await escrow.waitForDeployment();

  return {
    escrow,
    deployer,
    timeoutCallerSigner,
    buyer: new BuyerAgent(buyerSigner, escrow),
    seller: new SellerAgent(sellerSigner),
    buyerSigner,
    sellerSigner,
    feeSigner,
    addresses: {
      buyer: await buyerSigner.getAddress(),
      seller: await sellerSigner.getAddress(),
      fee: await feeSigner.getAddress(),
      dead: DEAD_WALLET,
      contract: await escrow.getAddress()
    }
  };
}

async function getBalances(addresses) {
  return {
    buyer: await ethers.provider.getBalance(addresses.buyer),
    seller: await ethers.provider.getBalance(addresses.seller),
    fee: await ethers.provider.getBalance(addresses.fee),
    dead: await ethers.provider.getBalance(addresses.dead),
    contract: await ethers.provider.getBalance(addresses.contract)
  };
}

async function getPendingWithdrawals(escrow, addresses) {
  return {
    buyer: await escrow.pendingWithdrawals(addresses.buyer),
    seller: await escrow.pendingWithdrawals(addresses.seller),
    fee: await escrow.pendingWithdrawals(addresses.fee),
    dead: await escrow.pendingWithdrawals(addresses.dead)
  };
}

function formatBalance(value) {
  return `${ethers.formatEther(value)} ETH`;
}

function signedDelta(before, after) {
  const delta = after - before;
  const sign = delta >= 0n ? "+" : "-";
  return `${sign}${ethers.formatEther(delta >= 0n ? delta : -delta)} ETH`;
}

function printBalanceTable(title, balances) {
  console.log(`\n${title}`);
  console.table({
    "Wallet A (Pembeli)": formatBalance(balances.buyer),
    "Wallet B (Penjual)": formatBalance(balances.seller),
    "Wallet Fee (Pemilik)": formatBalance(balances.fee),
    "Dead Wallet": formatBalance(balances.dead),
    "Escrow Contract": formatBalance(balances.contract)
  });
}

function printPendingWithdrawalsTable(title, pending) {
  console.log(`\n${title}`);
  console.table({
    "Wallet A (Pembeli)": formatBalance(pending.buyer),
    "Wallet B (Penjual)": formatBalance(pending.seller),
    "Wallet Fee (Pemilik)": formatBalance(pending.fee),
    "Dead Wallet": formatBalance(pending.dead)
  });
}

function printDeltaTable(before, after) {
  console.log("\nDelta Saldo");
  console.table({
    "Wallet A (Pembeli)": signedDelta(before.buyer, after.buyer),
    "Wallet B (Penjual)": signedDelta(before.seller, after.seller),
    "Wallet Fee (Pemilik)": signedDelta(before.fee, after.fee),
    "Dead Wallet": signedDelta(before.dead, after.dead),
    "Escrow Contract": signedDelta(before.contract, after.contract)
  });
}

async function increaseTime(seconds) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function printEscrowSnapshot(escrow, escrowId) {
  const details = await escrow.escrows(escrowId);
  console.log("\nEscrow Snapshot");
  console.table({
    escrowId: escrowId.toString(),
    amount: formatBalance(details.amount),
    feeAmount: formatBalance(details.feeAmount),
    sellerAmount: formatBalance(details.sellerAmount),
    deadline: details.deadline.toString(),
    status: details.status.toString()
  });
}

module.exports = {
  AGREEMENT_HASH,
  DEFAULT_AMOUNT,
  DEFAULT_DURATION_SECONDS,
  ZERO_GAS,
  deploySimulation,
  getBalances,
  getPendingWithdrawals,
  increaseTime,
  printBalanceTable,
  printDeltaTable,
  printPendingWithdrawalsTable,
  printEscrowSnapshot
};
