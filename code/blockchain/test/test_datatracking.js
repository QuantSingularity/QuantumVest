const DataTracking = artifacts.require("DataTracking");

contract("DataTracking", (accounts) => {
  let instance;
  const admin = accounts[0];
  const stranger = accounts[1];

  beforeEach(async () => {
    instance = await DataTracking.new({ from: admin });
  });

  it("should store market data", async () => {
    await instance.addDataPoint("ETH", 2500, 1000000, { from: admin });
    const data = await instance.getHistoricalData("ETH");
    assert.equal(data.length, 1, "Data storage failed");
    assert.equal(data[0].price, 2500);
    assert.equal(data[0].volume, 1000000);
  });

  it("should append multiple data points for the same ticker", async () => {
    await instance.addDataPoint("ETH", 2500, 1000000, { from: admin });
    await instance.addDataPoint("ETH", 2600, 900000, { from: admin });
    const data = await instance.getHistoricalData("ETH");
    assert.equal(data.length, 2);
    assert.equal(data[1].price, 2600);
  });

  it("should keep separate histories per ticker", async () => {
    await instance.addDataPoint("ETH", 2500, 1000000, { from: admin });
    await instance.addDataPoint("BTC", 60000, 50000, { from: admin });
    const eth = await instance.getHistoricalData("ETH");
    const btc = await instance.getHistoricalData("BTC");
    assert.equal(eth.length, 1);
    assert.equal(btc.length, 1);
    assert.equal(btc[0].price, 60000);
  });

  it("should emit a NewData event", async () => {
    const tx = await instance.addDataPoint("ETH", 2500, 1000000, {
      from: admin,
    });
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "NewData");
    assert.equal(tx.logs[0].args.price, 2500);
    assert.equal(tx.logs[0].args.volume, 1000000);
  });

  it("should reject data points from a non-owner", async () => {
    try {
      await instance.addDataPoint("ETH", 2500, 1000000, { from: stranger });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Unauthorized");
    }
  });

  it("should return an empty array for a ticker with no data", async () => {
    const data = await instance.getHistoricalData("DOGE");
    assert.equal(data.length, 0);
  });
});
