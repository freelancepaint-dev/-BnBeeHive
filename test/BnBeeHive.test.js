const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BnBeeHive", function () {
  async function fixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const F = await ethers.getContractFactory("BnBeeHive");
    const hive = await F.deploy(owner.address);
    await hive.waitForDeployment();
    await hive.seedMarket(108000000000n, { value: ethers.parseEther("10") });
    return { hive, owner, alice, bob };
  }

  it("initializes once", async function () {
    const { hive } = await fixture();
    expect(await hive.initialized()).to.equal(true);
    await expect(hive.seedMarket(1)).to.be.revertedWith("already initialized");
  });

  it("hires and compounds bees", async function () {
    const { hive, alice } = await fixture();
    await hive.connect(alice).hireBees(ethers.ZeroAddress, { value: ethers.parseEther("1") });
    expect(await hive.bees(alice.address)).to.be.gt(0);
  });

  it("records a valid referrer", async function () {
    const { hive, alice, bob } = await fixture();
    await hive.connect(alice).hireBees(bob.address, { value: ethers.parseEther("1") });
    expect(await hive.referrer(alice.address)).to.equal(bob.address);
  });

  it("accrues honey over time", async function () {
    const { hive, alice } = await fixture();
    await hive.connect(alice).hireBees(ethers.ZeroAddress, { value: ethers.parseEther("1") });
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);
    expect(await hive.myHoney(alice.address)).to.be.gt(0);
  });

  it("harvests from the contract pool", async function () {
    const { hive, alice } = await fixture();
    await hive.connect(alice).hireBees(ethers.ZeroAddress, { value: ethers.parseEther("1") });
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    await expect(hive.connect(alice).harvestHoney()).to.emit(hive, "Harvested");
  });
});
