const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BnBeeHive", function () {
  let hive;
  let owner;
  let alice;
  let bob;
  let treasury;

  const ZERO = ethers.ZeroAddress;
  const SEED = 108000000000n;

  beforeEach(async function () {
    [owner, alice, bob, treasury] = await ethers.getSigners();

    const Hive = await ethers.getContractFactory("BnBeeHive");
    hive = await Hive.deploy(treasury.address);
    await hive.waitForDeployment();
  });

  async function initialize() {
    await hive.connect(treasury).seedMarket(SEED, {
      value: ethers.parseEther("10"),
    });
  }

  it("initializes once", async function () {
    await initialize();

    expect(await hive.initialized()).to.equal(true);
    expect(await hive.marketHoney()).to.equal(SEED);

    await expect(
      hive.connect(treasury).seedMarket(SEED)
    ).to.be.reverted;
  });

  it("rejects initialization by a non-treasury account", async function () {
    await expect(
      hive.connect(alice).seedMarket(SEED, {
        value: ethers.parseEther("1"),
      })
    ).to.be.reverted;
  });

  it("rejects hiring before initialization", async function () {
    await expect(
      hive.connect(alice).hireBees(ZERO, {
        value: ethers.parseEther("1"),
      })
    ).to.be.reverted;
  });

  it("rejects a zero-value hire", async function () {
    await initialize();

    await expect(
      hive.connect(alice).hireBees(ZERO, { value: 0 })
    ).to.be.reverted;
  });

  it("hires and compounds bees", async function () {
    await initialize();

    await hive.connect(alice).hireBees(ZERO, {
      value: ethers.parseEther("1"),
    });

    expect(await hive.bees(alice.address)).to.be.gt(0);
  });

  it("records a valid referrer", async function () {
    await initialize();

    await hive.connect(alice).hireBees(bob.address, {
      value: ethers.parseEther("1"),
    });

    expect(await hive.referrer(alice.address)).to.equal(bob.address);
  });

  it("does not allow self-referral", async function () {
    await initialize();

    await hive.connect(alice).hireBees(alice.address, {
      value: ethers.parseEther("1"),
    });

    expect(await hive.referrer(alice.address)).to.equal(ZERO);
  });

  it("does not replace an existing referrer", async function () {
    await initialize();

    await hive.connect(alice).hireBees(bob.address, {
      value: ethers.parseEther("1"),
    });

    await hive.connect(alice).hireBees(owner.address, {
      value: ethers.parseEther("1"),
    });

    expect(await hive.referrer(alice.address)).to.equal(bob.address);
  });

  it("pays the treasury fee when hiring", async function () {
    await initialize();

    const deposit = ethers.parseEther("1");

    const before = await ethers.provider.getBalance(treasury.address);

    await hive.connect(alice).hireBees(ZERO, {
      value: deposit,
    });

    const after = await ethers.provider.getBalance(treasury.address);

    const expectedFee =
      (deposit * (await hive.DEV_FEE_BPS())) /
      (await hive.BPS());

    expect(after - before).to.equal(expectedFee);
  });

  it("accrues honey over time", async function () {
    await initialize();

    await hive.connect(alice).hireBees(ZERO, {
      value: ethers.parseEther("1"),
    });

    const before = await hive.myHoney(alice.address);

    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");

    const after = await hive.myHoney(alice.address);

    expect(after).to.be.gt(before);
  });

  it("rejects compounding when no honey can hire a bee", async function () {
    await initialize();

    await expect(
      hive.connect(alice).compoundHoney(ZERO)
    ).to.be.reverted;
  });

  it("harvests from the contract pool", async function () {
    await initialize();

    await hive.connect(alice).hireBees(ZERO, {
      value: ethers.parseEther("1"),
    });

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    const before = await ethers.provider.getBalance(alice.address);

    const tx = await hive.connect(alice).harvestHoney();
    const receipt = await tx.wait();

    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const after = await ethers.provider.getBalance(alice.address);

    expect(after + gasCost).to.be.gt(before);
  });

  it("resets claimed honey after harvest", async function () {
    await initialize();

    await hive.connect(alice).hireBees(ZERO, {
      value: ethers.parseEther("1"),
    });

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    await hive.connect(alice).harvestHoney();

    expect(await hive.claimedHoney(alice.address)).to.equal(0);
  });

  it("does not create BNB out of thin air", async function () {
    await initialize();

    const contractAddress = await hive.getAddress();
    const before = await ethers.provider.getBalance(contractAddress);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    const after = await ethers.provider.getBalance(contractAddress);

    expect(after).to.equal(before);
  });
    it("hireBees works after reentrancy ordering fix", async function () {
    await initialize();
    await hive.connect(alice).hireBees(ZERO, { value: ethers.parseEther("1") });
    expect(await hive.bees(alice.address)).to.be.greaterThan(

  });

    it("rejects a zero honey seed", async function () {
    await expect(
      hive.connect(treasury).seedMarket(0, {
        value: ethers.parseEther("1"),
      })
    ).to.be.revertedWith("zero seed");
  });

});
