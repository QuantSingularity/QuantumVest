const QuantumVestOracle = artifacts.require("QuantumVestOracle");

contract("QuantumVestOracle", (accounts) => {
  const admin = accounts[0];
  const asset = accounts[1]; // any address works as an "asset" key here
  const stranger = accounts[2];

  let oracle;

  async function increaseTime(seconds) {
    await new Promise((resolve) =>
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [seconds],
          id: 0,
        },
        resolve,
      ),
    );
    await new Promise((resolve) =>
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 },
        resolve,
      ),
    );
  }

  beforeEach(async () => {
    oracle = await QuantumVestOracle.new({ from: admin });
  });

  it("lets an ORACLE_ROLE holder update a price", async () => {
    await oracle.updatePrice(asset, web3.utils.toWei("2000", "ether"), 95, {
      from: admin,
    });
    const price = await oracle.getPrice(asset);
    assert.equal(price.toString(), web3.utils.toWei("2000", "ether"));
  });

  it("rejects updates from a non-oracle account", async () => {
    try {
      await oracle.updatePrice(asset, 100, 90, { from: stranger });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "revert");
    }
  });

  it("rejects a confidence value above 100", async () => {
    try {
      await oracle.updatePrice(asset, 100, 101, { from: admin });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Invalid confidence level");
    }
  });

  it("rejects reading a price that was never set", async () => {
    try {
      await oracle.getPrice(asset);
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Price not available");
    }
  });

  it("rejects reading a price below the minimum confidence threshold", async () => {
    await oracle.updatePrice(asset, 100, 50, { from: admin });
    try {
      await oracle.getPrice(asset);
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Price confidence too low");
    }
  });

  it("rejects reading a stale price", async () => {
    await oracle.updatePrice(asset, 100, 95, { from: admin });
    await increaseTime(3600 * 2); // beyond PRICE_VALIDITY_PERIOD (1 hour)

    try {
      await oracle.getPrice(asset);
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Price data stale");
    }

    const valid = await oracle.isPriceValid(asset);
    assert.isFalse(valid);
  });

  it("aggregates prices across registered feeds", async () => {
    await oracle.updatePrice(asset, 100, 95, { from: admin });
    await oracle.addPriceFeed(asset, accounts[4], { from: admin });
    await oracle.addPriceFeed(asset, accounts[5], { from: admin });

    await oracle.aggregatePrices(asset, { from: admin });
    const price = await oracle.getPrice(asset);
    assert.equal(price.toString(), "100");
  });
});
