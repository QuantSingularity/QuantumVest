const DataTracking = artifacts.require("DataTracking");
const TrendAnalysis = artifacts.require("TrendAnalysis");
const MockV3Aggregator = artifacts.require("MockV3Aggregator");

// Known Chainlink AggregatorV3 ETH/USD feed addresses, keyed by truffle
// network name.

const PRICE_FEEDS = {
  mainnet: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD, Ethereum Mainnet
};

module.exports = async function (deployer, network) {
  await deployer.deploy(DataTracking);

  let priceFeedAddress = process.env.PRICE_FEED_ADDRESS || PRICE_FEEDS[network];

  if (!priceFeedAddress) {
    // No known/env-supplied feed for this network (local development, or a
    // testnet without a hardcoded entry above): deploy a mock feed so
    // TrendAnalysis is still fully deployable and testable end-to-end.
    // Set PRICE_FEED_ADDRESS in .env to point at a real feed instead.
    await deployer.deploy(MockV3Aggregator, 8, 200000000000); // 8 decimals, $2,000.00000000
    const mockFeed = await MockV3Aggregator.deployed();
    priceFeedAddress = mockFeed.address;
  }

  await deployer.deploy(TrendAnalysis, priceFeedAddress);
};
