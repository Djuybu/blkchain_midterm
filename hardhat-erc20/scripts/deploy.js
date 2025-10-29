const hre = require("hardhat");

async function main() {
  const DjuybuTex = await hre.ethers.getContractFactory("DjuybuTex");
  const token = await DjuybuTex.deploy(1000000); // 1 triệu token
  await token.waitForDeployment();
  console.log(`DjuybuTex deployed to: ${await token.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
