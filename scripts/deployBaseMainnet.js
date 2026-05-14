const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const DEFAULT_DEAD_WALLET = "0x000000000000000000000000000000000000dEaD";

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill ${name}.`);
  }
  return value;
}

async function main() {
  if (network.name !== "baseMainnet") {
    throw new Error("This deployment script is intended for --network baseMainnet.");
  }

  requireEnv("BASE_MAINNET_RPC_URL");
  requireEnv("DEPLOYER_PRIVATE_KEY");

  const feeWallet = ethers.getAddress(requireEnv("FEE_WALLET"));
  const deadWallet = ethers.getAddress(process.env.DEAD_WALLET || DEFAULT_DEAD_WALLET);

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Deployer:", deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  console.log("Fee wallet:", feeWallet);
  console.log("Dead wallet:", deadWallet);

  if (balance === 0n) {
    throw new Error("Deployer has 0 ETH on Base Mainnet. Fund it before deploying.");
  }

  const Escrow = await ethers.getContractFactory("AIAgentEscrow");
  const escrow = await Escrow.deploy(deployerAddress, feeWallet, deadWallet);
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  const deploymentTx = escrow.deploymentTransaction();
  const receipt = await deploymentTx.wait();

  const output = {
    contractName: "AIAgentEscrow",
    network: "baseMainnet",
    chainId: network.config.chainId,
    contractAddress,
    deployer: deployerAddress,
    owner: deployerAddress,
    feeWallet,
    deadWallet,
    feeBps: 50,
    deploymentTxHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    explorer: `https://basescan.org/address/${contractAddress}`,
    deployedAt: new Date().toISOString()
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const outputPath = path.join(deploymentsDir, "base-mainnet.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log("\nDeployment complete:");
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
