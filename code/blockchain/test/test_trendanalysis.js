const TrendAnalysis = artifacts.require("TrendAnalysis");
const MockV3Aggregator = artifacts.require("MockV3Aggregator");

// BUGFIX COVERAGE: TrendAnalysis previously called the nonexistent
// `priceFeed.latestRound()`, so this contract could not even compile, and
// this test file was empty (0 bytes). It now compiles and these tests
// exercise both view functions, including the window/underflow guards
// added to calculateMA().
contract("TrendAnalysis", (accounts) => {
  const DECIMALS = 8;
  const INITIAL_PRICE = 200000000000; // $2,000.00000000

  let mockFeed;
  let trendAnalysis;

  beforeEach(async () => {
    mockFeed = await MockV3Aggregator.new(DECIMALS, INITIAL_PRICE);
    trendAnalysis = await TrendAnalysis.new(mockFeed.address);
  });

  it("should reject a zero-address price feed", async () => {
    try {
      await TrendAnalysis.new("0x0000000000000000000000000000000000000000");
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Invalid price feed");
    }
  });

  it("should return the latest price via getPriceTrend", async () => {
    const price = await trendAnalysis.getPriceTrend();
    assert.equal(price.toString(), INITIAL_PRICE.toString());
  });

  it("should track a price update from the feed", async () => {
    await mockFeed.updateAnswer(210000000000);
    const price = await trendAnalysis.getPriceTrend();
    assert.equal(price.toString(), "210000000000");
  });

  it("should compute a simple moving average over recent rounds", async () => {
    // Round 1 (constructor) = 200000000000
    await mockFeed.updateAnswer(210000000000); // round 2
    await mockFeed.updateAnswer(220000000000); // round 3

    const ma = await trendAnalysis.calculateMA(3);
    const expected = (200000000000 + 210000000000 + 220000000000) / 3;
    assert.equal(ma.toString(), expected.toString());
  });

  it("should compute the average over a smaller window than history", async () => {
    await mockFeed.updateAnswer(210000000000); // round 2
    await mockFeed.updateAnswer(220000000000); // round 3

    const ma = await trendAnalysis.calculateMA(2);
    const expected = (210000000000 + 220000000000) / 2;
    assert.equal(ma.toString(), expected.toString());
  });

  it("should revert when window is zero", async () => {
    try {
      await trendAnalysis.calculateMA(0);
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Window must be greater than 0");
    }
  });

  it("should revert when the window exceeds available history", async () => {
    // Only 1 round exists at this point (from the constructor).
    try {
      await trendAnalysis.calculateMA(5);
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Not enough historical rounds");
    }
  });
});
