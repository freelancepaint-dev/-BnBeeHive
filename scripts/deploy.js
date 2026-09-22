const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const treasury = process.env.TREASURY || deployer.address;
  const Factory = await hre.ethers.getContractFactory("BnBeeHive");
  const hive = await Factory.deploy(treasury);
  await hive.waitForDeployment();
  console.log("BnBeeHive:", await hive.getAddress());
  console.log("Treasury:", treasury);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
