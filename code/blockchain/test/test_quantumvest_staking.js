const QuantumVestStaking = artifacts.require("QuantumVestStaking");
const MockERC20 = artifacts.require("MockERC20");

contract("QuantumVestStaking", (accounts) => {
  const admin = accounts[0];
  const user = accounts[1];

  let staking;
  let stakingToken;
  let rewardToken;

  beforeEach(async () => {
    staking = await QuantumVestStaking.new({ from: admin });
    stakingToken = await MockERC20.new("Stake Token", "STK", { from: admin });
    rewardToken = await MockERC20.new("Reward Token", "RWD", { from: admin });

    await stakingToken.mint(user, web3.utils.toWei("1000", "ether"));
    await rewardToken.mint(staking.address, web3.utils.toWei("1000", "ether"));
  });

  async function createPool({
    rewardRate = 1,
    lockupPeriod = 0,
    minStake = 0,
  } = {}) {
    const tx = await staking.createPool(
      stakingToken.address,
      rewardToken.address,
      rewardRate,
      lockupPeriod,
      minStake,
      { from: admin },
    );
    return tx.logs[0].args.poolId;
  }

  it("rejects a zero-address staking or reward token at pool creation", async () => {
    try {
      await staking.createPool(
        "0x0000000000000000000000000000000000000000",
        rewardToken.address,
        1,
        0,
        0,
        { from: admin },
      );
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Invalid staking token");
    }
  });

  it("lets a user stake into a pool", async () => {
    const poolId = await createPool();

    await stakingToken.approve(
      staking.address,
      web3.utils.toWei("100", "ether"),
      {
        from: user,
      },
    );
    await staking.stake(poolId, web3.utils.toWei("100", "ether"), {
      from: user,
    });

    const info = await staking.getStakeInfo(poolId, user);
    assert.equal(info.amount.toString(), web3.utils.toWei("100", "ether"));
    assert.isTrue(info.isActive);

    const poolBalance = await stakingToken.balanceOf(staking.address);
    assert.equal(poolBalance.toString(), web3.utils.toWei("100", "ether"));
  });

  it("rejects staking below the pool minimum", async () => {
    const poolId = await createPool({
      minStake: web3.utils.toWei("10", "ether"),
    });

    await stakingToken.approve(
      staking.address,
      web3.utils.toWei("5", "ether"),
      {
        from: user,
      },
    );

    try {
      await staking.stake(poolId, web3.utils.toWei("5", "ether"), {
        from: user,
      });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Amount below minimum stake");
    }
  });

  it("enforces the lockup period on withdrawal", async () => {
    const poolId = await createPool({ lockupPeriod: 3600 * 24 });

    await stakingToken.approve(
      staking.address,
      web3.utils.toWei("50", "ether"),
      {
        from: user,
      },
    );
    await staking.stake(poolId, web3.utils.toWei("50", "ether"), {
      from: user,
    });

    try {
      await staking.withdraw(poolId, web3.utils.toWei("50", "ether"), {
        from: user,
      });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Lockup period not met");
    }
  });

  it("lets a user withdraw once unlocked and accrue rewards", async () => {
    const poolId = await createPool({
      rewardRate: web3.utils.toWei("1", "ether"),
    });

    await stakingToken.approve(
      staking.address,
      web3.utils.toWei("10", "ether"),
      {
        from: user,
      },
    );
    await staking.stake(poolId, web3.utils.toWei("10", "ether"), {
      from: user,
    });

    // advance time so some reward accrues
    await new Promise((resolve) =>
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "evm_increaseTime", params: [10], id: 0 },
        resolve,
      ),
    );
    await new Promise((resolve) =>
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 },
        resolve,
      ),
    );

    await staking.withdraw(poolId, web3.utils.toWei("10", "ether"), {
      from: user,
    });

    const stakerBalance = await stakingToken.balanceOf(user);
    assert.equal(stakerBalance.toString(), web3.utils.toWei("1000", "ether"));

    const earned = await staking.earned(poolId, user);
    assert.isTrue(web3.utils.toBN(earned).gt(web3.utils.toBN(0)));

    await staking.claimReward(poolId, { from: user });
    const rewardBalance = await rewardToken.balanceOf(user);
    assert.isTrue(web3.utils.toBN(rewardBalance).gt(web3.utils.toBN(0)));
  });
});
