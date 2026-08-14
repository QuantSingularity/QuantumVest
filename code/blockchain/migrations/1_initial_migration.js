// BUGFIX: this file was empty. Truffle's migration tracking relies on a
// deployed Migrations contract, which did not exist in contracts/ either
// (added as contracts/Migrations.sol), so `truffle migrate` had nothing to
// deploy here and no on-chain record of completed migrations.
const Migrations = artifacts.require("Migrations");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
