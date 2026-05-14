const { ethers } = require("hardhat");
const deployment = require("../deployments/base-sepolia.json");

const CONTRACT_ADDRESS = process.env.LIVE_CONTRACT_ADDRESS || deployment.contractAddress;
const EXPLORER_TX = "https://sepolia.basescan.org/tx/";

function formatEth(value) {
  return `${ethers.formatEther(value)} ETH`;
}

async function main() {
  const [wallet] = await ethers.getSigners();
  const address = await wallet.getAddress();
  const escrow = await ethers.getContractAt("AIAgentEscrow", CONTRACT_ADDRESS, wallet);

  const beforeBalance = await ethers.provider.getBalance(address);
  const beforePending = await escrow.pendingWithdrawals(address);

  console.log("Network: Base Sepolia");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Withdraw caller:", address);
  console.log("Balance before:", formatEth(beforeBalance));
  console.log("Pending before:", formatEth(beforePending));

  if (beforePending === 0n) {
    console.log("No pending withdrawal for this wallet. Nothing to withdraw.");
    return;
  }

  const tx = await escrow.withdraw();
  console.log("\nwithdraw tx:", tx.hash);
  console.log("withdraw explorer:", `${EXPLORER_TX}${tx.hash}`);
  const receipt = await tx.wait();
  console.log("withdraw block:", receipt.blockNumber);
  console.log("gas used:", receipt.gasUsed.toString());

  const afterBalance = await ethers.provider.getBalance(address);
  const afterPending = await escrow.pendingWithdrawals(address);
  const contractBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);

  console.log("\nAfter withdraw");
  console.table({
    walletBalance: formatEth(afterBalance),
    walletPending: formatEth(afterPending),
    contractBalance: formatEth(contractBalance)
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
