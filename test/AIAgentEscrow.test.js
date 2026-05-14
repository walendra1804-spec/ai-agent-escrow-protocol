const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const DEAD_WALLET = "0x000000000000000000000000000000000000dEaD";
const ZERO_GAS = { gasPrice: 0 };
const AMOUNT = ethers.parseEther("1");
const DURATION = 3600;
const AGREEMENT_HASH = ethers.id("unit-test-agreement");

describe("AIAgentEscrow", function () {
  async function deployFixture() {
    const [owner, buyer, seller, feeWallet, timeoutCaller, stranger] = await ethers.getSigners();
    const Escrow = await ethers.getContractFactory("AIAgentEscrow");
    const escrow = await Escrow.deploy(
      await owner.getAddress(),
      await feeWallet.getAddress(),
      DEAD_WALLET,
      ZERO_GAS
    );
    await escrow.waitForDeployment();

    return { escrow, owner, buyer, seller, feeWallet, timeoutCaller, stranger };
  }

  async function createEscrow(escrow, buyer, seller, agreementHash = AGREEMENT_HASH) {
    const tx = await escrow.connect(buyer).createEscrow(
      await seller.getAddress(),
      DURATION,
      agreementHash,
      {
        value: AMOUNT,
        ...ZERO_GAS
      }
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return escrow.interface.parseLog(log);
        } catch (_) {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "EscrowCreated");

    return event.args.escrowId;
  }

  it("records release payouts as pending withdrawals for seller and fee wallet", async function () {
    const { escrow, buyer, seller, feeWallet } = await deployFixture();
    const escrowId = await createEscrow(escrow, buyer, seller);
    const sellerBefore = await ethers.provider.getBalance(await seller.getAddress());
    const feeBefore = await ethers.provider.getBalance(await feeWallet.getAddress());

    await (await escrow.connect(buyer).release(escrowId, ZERO_GAS)).wait();

    const fee = (AMOUNT * 50n) / 10000n;
    const sellerAmount = AMOUNT - fee;
    expect(await ethers.provider.getBalance(await seller.getAddress())).to.equal(sellerBefore);
    expect(await ethers.provider.getBalance(await feeWallet.getAddress())).to.equal(feeBefore);
    expect(await escrow.pendingWithdrawals(await seller.getAddress())).to.equal(sellerAmount);
    expect(await escrow.pendingWithdrawals(await feeWallet.getAddress())).to.equal(fee);

    const details = await escrow.escrows(escrowId);
    expect(details.status).to.equal(2n);
    expect(details.feeAmount).to.equal(fee);
    expect(details.sellerAmount).to.equal(sellerAmount);

    await (await escrow.connect(feeWallet).withdraw(ZERO_GAS)).wait();
    await (await escrow.connect(seller).withdraw(ZERO_GAS)).wait();

    expect(await ethers.provider.getBalance(await seller.getAddress())).to.equal(sellerBefore + sellerAmount);
    expect(await ethers.provider.getBalance(await feeWallet.getAddress())).to.equal(feeBefore + fee);
    expect(await escrow.pendingWithdrawals(await seller.getAddress())).to.equal(0n);
    expect(await escrow.pendingWithdrawals(await feeWallet.getAddress())).to.equal(0n);
  });

  it("burns all funds on buyer dispute and does not pay seller or fee wallet", async function () {
    const { escrow, buyer, seller, feeWallet } = await deployFixture();
    const escrowId = await createEscrow(escrow, buyer, seller);
    const sellerBefore = await ethers.provider.getBalance(await seller.getAddress());
    const feeBefore = await ethers.provider.getBalance(await feeWallet.getAddress());
    const deadBefore = await ethers.provider.getBalance(DEAD_WALLET);

    await (await escrow.connect(buyer).dispute(escrowId, ZERO_GAS)).wait();

    expect(await ethers.provider.getBalance(await seller.getAddress())).to.equal(sellerBefore);
    expect(await ethers.provider.getBalance(await feeWallet.getAddress())).to.equal(feeBefore);
    expect(await ethers.provider.getBalance(DEAD_WALLET)).to.equal(deadBefore + AMOUNT);

    const details = await escrow.escrows(escrowId);
    expect(details.status).to.equal(3n);
    expect(details.feeAmount).to.equal(0n);
    expect(details.sellerAmount).to.equal(0n);
  });

  it("records timeout payouts as pending withdrawals for seller and fee wallet", async function () {
    const { escrow, buyer, seller, feeWallet, timeoutCaller } = await deployFixture();
    const escrowId = await createEscrow(escrow, buyer, seller);
    const sellerBefore = await ethers.provider.getBalance(await seller.getAddress());
    const feeBefore = await ethers.provider.getBalance(await feeWallet.getAddress());

    await network.provider.send("evm_increaseTime", [DURATION + 1]);
    await network.provider.send("evm_mine");
    await (await escrow.connect(timeoutCaller).claimTimeout(escrowId, ZERO_GAS)).wait();

    const fee = (AMOUNT * 50n) / 10000n;
    const sellerAmount = AMOUNT - fee;
    expect(await ethers.provider.getBalance(await seller.getAddress())).to.equal(sellerBefore);
    expect(await ethers.provider.getBalance(await feeWallet.getAddress())).to.equal(feeBefore);
    expect(await escrow.pendingWithdrawals(await seller.getAddress())).to.equal(sellerAmount);
    expect(await escrow.pendingWithdrawals(await feeWallet.getAddress())).to.equal(fee);

    const details = await escrow.escrows(escrowId);
    expect(details.status).to.equal(4n);
    expect(details.feeAmount).to.equal(fee);
    expect(details.sellerAmount).to.equal(sellerAmount);

    await (await escrow.connect(feeWallet).withdraw(ZERO_GAS)).wait();
    await (await escrow.connect(seller).withdraw(ZERO_GAS)).wait();

    expect(await ethers.provider.getBalance(await seller.getAddress())).to.equal(sellerBefore + sellerAmount);
    expect(await ethers.provider.getBalance(await feeWallet.getAddress())).to.equal(feeBefore + fee);
  });

  it("blocks non-buyers from release and dispute", async function () {
    const { escrow, buyer, seller, stranger } = await deployFixture();
    const escrowId = await createEscrow(escrow, buyer, seller);

    await expect(escrow.connect(stranger).release(escrowId, ZERO_GAS))
      .to.be.revertedWithCustomError(escrow, "OnlyBuyer");
    await expect(escrow.connect(stranger).dispute(escrowId, ZERO_GAS))
      .to.be.revertedWithCustomError(escrow, "OnlyBuyer");
  });

  it("blocks disputes after timeout deadline", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const escrowId = await createEscrow(escrow, buyer, seller);

    await network.provider.send("evm_increaseTime", [DURATION + 1]);
    await network.provider.send("evm_mine");

    await expect(escrow.connect(buyer).dispute(escrowId, ZERO_GAS))
      .to.be.revertedWithCustomError(escrow, "EscrowExpired");
  });

  it("rejects duplicate agreement hashes", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    await createEscrow(escrow, buyer, seller);

    await expect(
      escrow.connect(buyer).createEscrow(
        await seller.getAddress(),
        DURATION,
        AGREEMENT_HASH,
        {
          value: AMOUNT,
          ...ZERO_GAS
        }
      )
    ).to.be.revertedWithCustomError(escrow, "AgreementHashAlreadyUsed");
  });

  it("rejects zero agreement hash", async function () {
    const { escrow, buyer, seller } = await deployFixture();

    await expect(
      escrow.connect(buyer).createEscrow(
        await seller.getAddress(),
        DURATION,
        ethers.ZeroHash,
        {
          value: AMOUNT,
          ...ZERO_GAS
        }
      )
    ).to.be.revertedWithCustomError(escrow, "InvalidAgreementHash");
  });

  it("does not block release when seller rejects native token transfers", async function () {
    const { escrow, buyer, feeWallet } = await deployFixture();
    const Receiver = await ethers.getContractFactory("RevertingNativeReceiver");
    const rejectingSeller = await Receiver.deploy(ZERO_GAS);
    await rejectingSeller.waitForDeployment();

    const tx = await escrow.connect(buyer).createEscrow(
      await rejectingSeller.getAddress(),
      DURATION,
      ethers.id("rejecting-seller-order"),
      {
        value: AMOUNT,
        ...ZERO_GAS
      }
    );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return escrow.interface.parseLog(log);
        } catch (_) {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "EscrowCreated");
    const escrowId = event.args.escrowId;

    await expect(escrow.connect(buyer).release(escrowId, ZERO_GAS)).to.not.be.reverted;

    const fee = (AMOUNT * 50n) / 10000n;
    const sellerAmount = AMOUNT - fee;
    expect(await escrow.pendingWithdrawals(await rejectingSeller.getAddress())).to.equal(sellerAmount);
    expect(await escrow.pendingWithdrawals(await feeWallet.getAddress())).to.equal(fee);
  });

  it("rejects withdraw when caller has no pending balance", async function () {
    const { escrow, stranger } = await deployFixture();

    await expect(escrow.connect(stranger).withdraw(ZERO_GAS))
      .to.be.revertedWithCustomError(escrow, "NoPendingWithdrawal");
  });
});
