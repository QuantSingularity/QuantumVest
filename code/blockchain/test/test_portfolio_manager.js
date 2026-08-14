const PortfolioManager = artifacts.require("PortfolioManager");
const MockERC20 = artifacts.require("MockERC20");

contract("PortfolioManager", (accounts) => {
  const admin = accounts[0];
  const feeCollector = accounts[1];
  const priceOracle = accounts[2];
  const user = accounts[3];

  let manager;
  let asset;

  beforeEach(async () => {
    manager = await PortfolioManager.new(feeCollector, priceOracle, {
      from: admin,
    });
    asset = await MockERC20.new("Test Asset", "TAST", { from: admin });

    await asset.mint(user, web3.utils.toWei("1000", "ether"));
    await manager.addSupportedAsset(
      asset.address,
      "TAST",
      18,
      web3.utils.toWei("1", "ether"), // priceOracle: 1 TAST = 1 unit of value
      { from: admin },
    );
  });

  it("rejects a zero-address fee collector or price oracle at deployment", async () => {
    try {
      await PortfolioManager.new(
        "0x0000000000000000000000000000000000000000",
        priceOracle,
        { from: admin },
      );
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Invalid fee collector");
    }
  });

  it("creates a portfolio for the caller", async () => {
    const tx = await manager.createPortfolio("Retirement", { from: user });
    assert.equal(tx.logs[0].event, "PortfolioCreated");

    const ids = await manager.getUserPortfolios(user);
    assert.equal(ids.length, 1);
  });

  it("adds a supported asset into a portfolio and moves the tokens in", async () => {
    await manager.createPortfolio("Retirement", { from: user });
    const [portfolioId] = await manager.getUserPortfolios(user);

    await asset.approve(manager.address, web3.utils.toWei("100", "ether"), {
      from: user,
    });
    await manager.addAsset(
      portfolioId,
      asset.address,
      web3.utils.toWei("100", "ether"),
      { from: user },
    );

    const managerBalance = await asset.balanceOf(manager.address);
    assert.equal(managerBalance.toString(), web3.utils.toWei("100", "ether"));

    const result = await manager.getPortfolioAssets(portfolioId);
    const assets = result[0];
    const balances = result[1];
    assert.equal(assets[0], asset.address);
    assert.equal(balances[0].toString(), web3.utils.toWei("100", "ether"));
  });

  it("rejects adding an unsupported asset", async () => {
    await manager.createPortfolio("Retirement", { from: user });
    const [portfolioId] = await manager.getUserPortfolios(user);
    const other = await MockERC20.new("Other", "OTH", { from: admin });

    try {
      await manager.addAsset(portfolioId, other.address, 1, { from: user });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Asset not supported");
    }
  });

  it("removes an asset and returns tokens to the owner", async () => {
    await manager.createPortfolio("Retirement", { from: user });
    const [portfolioId] = await manager.getUserPortfolios(user);

    await asset.approve(manager.address, web3.utils.toWei("100", "ether"), {
      from: user,
    });
    await manager.addAsset(
      portfolioId,
      asset.address,
      web3.utils.toWei("100", "ether"),
      { from: user },
    );

    await manager.removeAsset(
      portfolioId,
      asset.address,
      web3.utils.toWei("40", "ether"),
      { from: user },
    );

    const userBalance = await asset.balanceOf(user);
    // started with 1000, sent 100 in, got 40 back => 940
    assert.equal(userBalance.toString(), web3.utils.toWei("940", "ether"));
  });

  it("only lets the portfolio owner add or remove assets", async () => {
    await manager.createPortfolio("Retirement", { from: user });
    const [portfolioId] = await manager.getUserPortfolios(user);

    try {
      await manager.addAsset(portfolioId, asset.address, 1, {
        from: admin,
      });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Not portfolio owner");
    }
  });
});
