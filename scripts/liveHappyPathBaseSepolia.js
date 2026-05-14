const { ethers } = require("hardhat");
const deployment = require("../deployments/base-sepolia.json");

const CONTRACT_ADDRESS = process.env.LIVE_CONTRACT_ADDRESS || deployment.contractAddress;
const EXPLORER_TX = "https://sepolia.basescan.org/tx/";
const EXPLORER_ADDRESS = "https://sepolia.basescan.org/address/";

function formatEth(value) {
  return `${ethers.formatEther(value)} ETH`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function printState(label, provider, escrow, addresses) {
  const [buyerBalance, sellerBalance, feeBalance, contractBalance] = await Promise.all([
    provider.getBalance(addresses.buyer),
    provider.getBalance(addresses.seller),
    provider.getBalance(addresses.fee),
    provider.getBalance(CONTRACT_ADDRESS)
  ]);

  const [buyerPending, sellerPending, feePending] = await Promise.all([
    escrow.pendingWithdrawals(addresses.buyer),
    escrow.pendingWithdrawals(addresses.seller),
    escrow.pendingWithdrawals(addresses.fee)
  ]);

  console.log(`\n${label}`);
  console.table({
    buyerBalance: formatEth(buyerBalance),
    sellerBalance: formatEth(sellerBalance),
    feeBalance: formatEth(feeBalance),
    contractBalance: formatEth(contractBalance),
    buyerPending: formatEth(buyerPending),
    sellerPending: formatEth(sellerPending),
    feePending: formatEth(feePending)
  });
}

async function main() {
  const [buyer] = await ethers.getSigners();
  const provider = ethers.provider;
  const escrow = await ethers.getContractAt("AIAgentEscrow", CONTRACT_ADDRESS, buyer);

  const buyerAddress = await buyer.getAddress();
  const sellerAddress = ethers.getAddress(process.env.LIVE_SELLER_ADDRESS || buyerAddress);
  const feeWallet = await escrow.feeWallet();
  const amount = ethers.parseEther(process.env.LIVE_ESCROW_AMOUNT_ETH || "0.000001");
  const durationSeconds = BigInt(process.env.LIVE_ESCROW_DURATION_SECONDS || "3600");
  const agreementHash = ethers.id(`base-sepolia-live-test:${buyerAddress}:${Date.now()}`);

  const network = await provider.getNetwork();
  console.log("Network:", network.name, Number(network.chainId));
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Contract Explorer:", `${EXPLORER_ADDRESS}${CONTRACT_ADDRESS}`);
  console.log("Buyer:", buyerAddress);
  console.log("Seller:", sellerAddress);
  console.log("Fee wallet:", feeWallet);
  console.log("Amount:", formatEth(amount));
  console.log("Duration seconds:", durationSeconds.toString());
  console.log("Agreement hash:", agreementHash);

  await printState("Before createEscrow", provider, escrow, {
    buyer: buyerAddress,
    seller: sellerAddress,
    fee: feeWallet
  });

  const createTx = await escrow.createEscrow(sellerAddress, durationSeconds, agreementHash, {
    value: amount
  });
  console.log("\ncreateEscrow tx:", createTx.hash);
  console.log("createEscrow explorer:", `${EXPLORER_TX}${createTx.hash}`);
  const createReceipt = await createTx.wait();
  await sleep(3000);

  const createdEvent = createReceipt.logs
    .map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch (_) {
        return null;
      }
    })
    .find((event) => event && event.name === "EscrowCreated");

  if (!createdEvent) {
    throw new Error("EscrowCreated event not found");
  }

  const escrowId = createdEvent.args.escrowId;
  console.log("Escrow ID:", escrowId.toString());
  console.log("Create block:", createReceipt.blockNumber);

  await printState("After createEscrow / funds locked", provider, escrow, {
    buyer: buyerAddress,
    seller: sellerAddress,
    fee: feeWallet
  });

  const releaseTx = await escrow.release(escrowId);
  console.log("\nrelease tx:", releaseTx.hash);
  console.log("release explorer:", `${EXPLORER_TX}${releaseTx.hash}`);
  const releaseReceipt = await releaseTx.wait();
  await sleep(3000);
  console.log("Release block:", releaseReceipt.blockNumber);

  const escrowSnapshot = await escrow.escrows(escrowId);
  console.log("\nEscrow snapshot after release");
  console.table({
    escrowId: escrowId.toString(),
    amount: formatEth(escrowSnapshot.amount),
    feeAmount: formatEth(escrowSnapshot.feeAmount),
    sellerAmount: formatEth(escrowSnapshot.sellerAmount),
    status: escrowSnapshot.status.toString()
  });

  await printState("After release / pending withdrawal recorded", provider, escrow, {
    buyer: buyerAddress,
    seller: sellerAddress,
    fee: feeWallet
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
