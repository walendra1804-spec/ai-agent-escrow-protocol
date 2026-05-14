class SellerAgent {
  constructor(signer) {
    this.signer = signer;
  }

  async address() {
    return this.signer.getAddress();
  }
}

module.exports = { SellerAgent };
