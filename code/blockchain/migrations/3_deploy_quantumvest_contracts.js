const QuantumVestToken = artifacts.require("QuantumVestToken");
const QuantumVestOracle = artifacts.require("QuantumVestOracle");
const PortfolioManager = artifacts.require("PortfolioManager");
const QuantumVestStaking = artifacts.require("QuantumVestStaking");
const QuantumVestGovernance = artifacts.require("QuantumVestGovernance");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(QuantumVestToken);
  const token = await QuantumVestToken.deployed();

  await deployer.deploy(QuantumVestOracle);
  const oracle = await QuantumVestOracle.deployed();

  // feeCollector defaults to the deploying account for local/testnet use;
  // override with FEE_COLLECTOR_ADDRESS for a real deployment.
  const feeCollector = process.env.FEE_COLLECTOR_ADDRESS || accounts[0];
  await deployer.deploy(PortfolioManager, feeCollector, oracle.address);

  await deployer.deploy(QuantumVestStaking);

  await deployer.deploy(QuantumVestGovernance, token.address);
};
