const {
  AGREEMENT_HASH,
  DEFAULT_AMOUNT,
  DEFAULT_DURATION_SECONDS,
  deploySimulation,
  getBalances,
  getPendingWithdrawals,
  printBalanceTable,
  printDeltaTable,
  printPendingWithdrawalsTable,
  printEscrowSnapshot
} = require("./simulationUtils");

async function main() {
  console.log("Skenario 2: Dispute / Burn");
  const { escrow, buyer, seller, addresses } = await deploySimulation();

  const before = await getBalances(addresses);
  printBalanceTable("Saldo Awal", before);

  console.log("\nAgent A mengunci 1 ETH simulasi untuk Agent B.");
  const escrowId = await buyer.lockFunds({
    seller: await seller.address(),
    amount: DEFAULT_AMOUNT,
    durationSeconds: DEFAULT_DURATION_SECONDS,
    agreementHash: AGREEMENT_HASH
  });
  await printEscrowSnapshot(escrow, escrowId);

  console.log("\nAgent A memanggil API Dispute/Burn.");
  await buyer.dispute(escrowId);

  const after = await getBalances(addresses);
  printBalanceTable("Saldo Akhir", after);
  printDeltaTable(before, after);
  printPendingWithdrawalsTable(
    "Pending Withdrawals Akhir",
    await getPendingWithdrawals(escrow, addresses)
  );
  await printEscrowSnapshot(escrow, escrowId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
