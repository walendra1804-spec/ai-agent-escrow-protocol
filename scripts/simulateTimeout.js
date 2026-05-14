const {
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
} = require("./simulationUtils");

async function main() {
  console.log("Skenario 3: Timeout");
  const { escrow, buyer, seller, sellerSigner, feeSigner, timeoutCallerSigner, addresses } = await deploySimulation();

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

  console.log("\nWaktu escrow dimajukan sampai melewati deadline.");
  await increaseTime(DEFAULT_DURATION_SECONDS + 1);

  console.log("\nCaller permissionless memanggil API Timeout. Dana dicatat sebagai pending withdrawal untuk Agent B dan wallet pemilik.");
  const tx = await escrow.connect(timeoutCallerSigner).claimTimeout(escrowId, ZERO_GAS);
  await tx.wait();
  printBalanceTable("Saldo Setelah Timeout (belum withdraw)", await getBalances(addresses));
  printPendingWithdrawalsTable(
    "Pending Withdrawals Setelah Timeout",
    await getPendingWithdrawals(escrow, addresses)
  );

  console.log("\nAgent B dan Wallet Fee memanggil withdraw().");
  await (await escrow.connect(feeSigner).withdraw(ZERO_GAS)).wait();
  await (await escrow.connect(sellerSigner).withdraw(ZERO_GAS)).wait();

  const after = await getBalances(addresses);
  printBalanceTable("Saldo Akhir", after);
  printDeltaTable(before, after);
  await printEscrowSnapshot(escrow, escrowId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
