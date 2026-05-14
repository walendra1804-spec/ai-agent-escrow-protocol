const ZERO_GAS = { gasPrice: 0 };

class BuyerAgent {
  constructor(signer, escrowContract) {
    this.signer = signer;
    this.escrowContract = escrowContract;
  }

  async address() {
    return this.signer.getAddress();
  }

  async lockFunds({ seller, amount, durationSeconds, agreementHash }) {
    const tx = await this.escrowContract
      .connect(this.signer)
      .createEscrow(seller, durationSeconds, agreementHash, {
        value: amount,
        ...ZERO_GAS
      });
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return this.escrowContract.interface.parseLog(log);
        } catch (_) {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "EscrowCreated");

    return event.args.escrowId;
  }

  async release(escrowId) {
    const tx = await this.escrowContract.connect(this.signer).release(escrowId, ZERO_GAS);
    await tx.wait();
  }

  async dispute(escrowId) {
    const tx = await this.escrowContract.connect(this.signer).dispute(escrowId, ZERO_GAS);
    await tx.wait();
  }
}

module.exports = { BuyerAgent };
