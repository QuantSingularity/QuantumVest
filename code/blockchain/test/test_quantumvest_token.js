const QuantumVestToken = artifacts.require("QuantumVestToken");

contract("QuantumVestToken", (accounts) => {
  const admin = accounts[0];
  const alice = accounts[1];
  const bob = accounts[2];

  let token;

  beforeEach(async () => {
    token = await QuantumVestToken.new({ from: admin });
  });

  it("mints the initial supply to the deployer", async () => {
    const supply = await token.totalSupply();
    const adminBalance = await token.balanceOf(admin);
    assert.equal(supply.toString(), adminBalance.toString());
  });

  it("allows a MINTER_ROLE holder to mint up to MAX_SUPPLY", async () => {
    await token.mint(alice, web3.utils.toWei("1000", "ether"), {
      from: admin,
    });
    const balance = await token.balanceOf(alice);
    assert.equal(balance.toString(), web3.utils.toWei("1000", "ether"));
  });

  it("rejects minting beyond MAX_SUPPLY", async () => {
    const maxSupply = await token.MAX_SUPPLY();
    const totalSupply = await token.totalSupply();
    const remaining = maxSupply.sub(totalSupply);
    const tooMuch = remaining.add(web3.utils.toBN(1));

    try {
      await token.mint(alice, tooMuch, { from: admin });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Exceeds max supply");
    }
  });

  it("rejects minting from a non-minter account", async () => {
    try {
      await token.mint(alice, 1, { from: alice });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "revert");
    }
  });

  it("blocks transfers to/from a blacklisted account", async () => {
    await token.transfer(alice, web3.utils.toWei("100", "ether"), {
      from: admin,
    });
    await token.setBlacklist(alice, true, { from: admin });

    try {
      await token.transfer(bob, 1, { from: alice });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Compliance violation");
    }
  });

  it("enforces the transfer cooldown between consecutive sends", async () => {
    await token.transfer(alice, web3.utils.toWei("100", "ether"), {
      from: admin,
    });

    try {
      // admin already transferred once above; a second immediate transfer
      // from the same sender should hit the cooldown.
      await token.transfer(bob, web3.utils.toWei("10", "ether"), {
        from: admin,
      });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Transfer cooldown active");
    }
  });

  it("pauses and unpauses transfers", async () => {
    await token.pause({ from: admin });

    try {
      await token.transfer(alice, 1, { from: admin });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Pausable: paused");
    }

    await token.unpause({ from: admin });
    await token.transfer(alice, 1, { from: admin }); // should now succeed
    const balance = await token.balanceOf(alice);
    assert.equal(balance.toString(), "1");
  });

  // BUGFIX COVERAGE: vestingSchedule was previously recorded but never
  // enforced anywhere, so it had zero effect on transfers. This confirms
  // the fix actually blocks a still-vesting account from transferring out.
  it("blocks transfers out of an account still inside its vesting period", async () => {
    await token.transfer(alice, web3.utils.toWei("100", "ether"), {
      from: admin,
    });

    const future = Math.floor(Date.now() / 1000) + 3600 * 24 * 30; // 30 days out
    await token.setVestingSchedule(alice, future, { from: admin });

    try {
      await token.transfer(bob, web3.utils.toWei("1", "ether"), {
        from: alice,
      });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Tokens are still vesting");
    }
  });

  it("allows transfers once the vesting period has elapsed", async () => {
    await token.transfer(alice, web3.utils.toWei("100", "ether"), {
      from: admin,
    });

    const past = Math.floor(Date.now() / 1000) - 1; // already elapsed
    await token.setVestingSchedule(alice, past, { from: admin });

    await token.transfer(bob, web3.utils.toWei("1", "ether"), {
      from: alice,
    });
    const balance = await token.balanceOf(bob);
    assert.equal(balance.toString(), web3.utils.toWei("1", "ether"));
  });
});
