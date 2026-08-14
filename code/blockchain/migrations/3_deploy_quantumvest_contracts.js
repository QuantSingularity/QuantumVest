const QuantumVestToken = artifacts.require("QuantumVestToken");
const QuantumVestOracle = artifacts.require("QuantumVestOracle");
const PortfolioManager = artifacts.require("PortfolioManager");
const QuantumVestStaking = artifacts.require("QuantumVestStaking");
const QuantumVestGovernance = artifacts.require("QuantumVestGovernance");

// BUGFIX: these contracts previously lived in a single smart_contracts.sol
// file at the blockchain project root, outside contracts/ (Truffle's
// default contracts_directory), so `truffle compile`/`migrate` never even
// saw them. They're now split into contracts/*.sol (one contract per file)
// and deployed here.
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
