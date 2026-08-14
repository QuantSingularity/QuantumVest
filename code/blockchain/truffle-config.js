// BUGFIX: this file referenced `HDWalletProvider` and `mnemonic` without ever
// requiring/defining either, so any attempt to deploy to bsc_testnet threw a
// ReferenceError. It now loads the mnemonic from a `.env` file (see
// `.env.example`) and only builds the provider on demand.
require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

const MNEMONIC = process.env.MNEMONIC;
const BSC_TESTNET_RPC_URL =
  process.env.BSC_TESTNET_RPC_URL ||
  "https://data-seed-prebsc-1-s1.binance.org:8545";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
    },
    // Used by docker-compose.yml's blockchain-migrate service to deploy
    // against the ganache service on the shared compose network. Chain/
    // network id is pinned (see docker-compose.yml's `ganache` command) so
    // the deployed-address entries Truffle writes into build/contracts/
    // *.json are stable across restarts - see backend/app/services/
    // blockchain.py, which resolves addresses by network id.
    docker: {
      host: process.env.GANACHE_HOST || "ganache",
      port: process.env.GANACHE_PORT || 8545,
      network_id: 1337,
    },
    bsc_testnet: {
      provider: () => {
        if (!MNEMONIC) {
          throw new Error(
            "Missing MNEMONIC environment variable. Copy .env.example to " +
              ".env and set MNEMONIC before deploying to bsc_testnet.",
          );
        }
        return new HDWalletProvider(MNEMONIC, BSC_TESTNET_RPC_URL);
      },
      network_id: 97,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gasPrice: 10000000000,
    },
  },

  mocha: {
    timeout: 100000,
  },

  compilers: {
    solc: {
      // BUGFIX: pragmas across the project range from ^0.8.0 to ^0.8.19; the
      // original config pinned 0.8.0, which is too low to compile files
      // declaring ^0.8.19. Bumped to 0.8.19, the highest pragma in use.
      //
      // Resolved from the locally installed `solc` npm package (see
      // package.json) rather than fetched from solc-bin at compile time, so
      // `truffle compile`/`truffle test` work in offline or network-restricted
      // environments (CI runners, sandboxes, corporate proxies, etc.).
      version: require.resolve("solc"),
      settings: {
        optimizer: { enabled: true, runs: 200 },
      },
    },
  },
};
