// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title QuantumVest Staking
 * @dev Multi-pool staking and rewards distribution contract.
 * @author QuantumVest Team
 */
contract QuantumVestStaking is ReentrancyGuard, AccessControl {
    using SafeMath for uint256;
    // BUGFIX: token transfer return values were never checked, so a
    // non-reverting ERC20 that returns `false` on failure would silently
    // "succeed" while moving no tokens. SafeERC20 reverts on failure.
    using SafeERC20 for IERC20;

    bytes32 public constant REWARDS_DISTRIBUTOR_ROLE = keccak256(
        "REWARDS_DISTRIBUTOR_ROLE"
    );

    struct StakeInfo {
        uint256 amount;
        uint256 stakingTime;
        uint256 lastRewardTime;
        uint256 rewardDebt;
        bool isActive;
    }

    struct Pool {
        IERC20 stakingToken;
        IERC20 rewardToken;
        uint256 rewardRate; // Rewards per second
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        uint256 totalStaked;
        bool isActive;
        uint256 lockupPeriod;
        uint256 minStakeAmount;
    }

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => StakeInfo)) public stakes;
    mapping(uint256 => mapping(address => uint256))
        public userRewardPerTokenPaid;
    mapping(uint256 => mapping(address => uint256)) public rewards;

    uint256 public poolCounter;
    uint256 public constant REWARD_PRECISION = 1e18;

    event PoolCreated(
        uint256 indexed poolId,
        address stakingToken,
        address rewardToken
    );
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Withdrawn(
        address indexed user,
        uint256 indexed poolId,
        uint256 amount
    );
    event RewardPaid(
        address indexed user,
        uint256 indexed poolId,
        uint256 reward
    );
    event RewardRateUpdated(uint256 indexed poolId, uint256 newRate);

    modifier updateReward(uint256 poolId, address account) {
        Pool storage pool = pools[poolId];
        pool.rewardPerTokenStored = rewardPerToken(poolId);
        pool.lastUpdateTime = block.timestamp;

        if (account != address(0)) {
            rewards[poolId][account] = earned(poolId, account);
            userRewardPerTokenPaid[poolId][account] = pool.rewardPerTokenStored;
        }
        _;
    }

    modifier poolExists(uint256 poolId) {
        require(pools[poolId].isActive, "Pool does not exist or is inactive");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REWARDS_DISTRIBUTOR_ROLE, msg.sender);
    }

    function createPool(
        address stakingToken,
        address rewardToken,
        uint256 rewardRate,
        uint256 lockupPeriod,
        uint256 minStakeAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(stakingToken != address(0), "Invalid staking token");
        require(rewardToken != address(0), "Invalid reward token");

        poolCounter = poolCounter.add(1);
        uint256 poolId = poolCounter;

        pools[poolId] = Pool({
            stakingToken: IERC20(stakingToken),
            rewardToken: IERC20(rewardToken),
            rewardRate: rewardRate,
            lastUpdateTime: block.timestamp,
            rewardPerTokenStored: 0,
            totalStaked: 0,
            isActive: true,
            lockupPeriod: lockupPeriod,
            minStakeAmount: minStakeAmount
        });

        emit PoolCreated(poolId, stakingToken, rewardToken);
        return poolId;
    }

    function stake(
        uint256 poolId,
        uint256 amount
    )
        external
        nonReentrant
        updateReward(poolId, msg.sender)
        poolExists(poolId)
    {
        Pool storage pool = pools[poolId];
        require(amount >= pool.minStakeAmount, "Amount below minimum stake");

        StakeInfo storage stakeInfo = stakes[poolId][msg.sender];

        if (stakeInfo.isActive) {
            stakeInfo.amount = stakeInfo.amount.add(amount);
        } else {
            stakeInfo.amount = amount;
            stakeInfo.stakingTime = block.timestamp;
            stakeInfo.isActive = true;
        }

        stakeInfo.lastRewardTime = block.timestamp;

        pool.totalStaked = pool.totalStaked.add(amount);
        pool.stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, poolId, amount);
    }

    function withdraw(
        uint256 poolId,
        uint256 amount
    )
        external
        nonReentrant
        updateReward(poolId, msg.sender)
        poolExists(poolId)
    {
        Pool storage pool = pools[poolId];
        StakeInfo storage stakeInfo = stakes[poolId][msg.sender];

        require(stakeInfo.isActive, "No active stake");
        require(stakeInfo.amount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= stakeInfo.stakingTime.add(pool.lockupPeriod),
            "Lockup period not met"
        );

        stakeInfo.amount = stakeInfo.amount.sub(amount);

        if (stakeInfo.amount == 0) {
            stakeInfo.isActive = false;
        }

        pool.totalStaked = pool.totalStaked.sub(amount);
        pool.stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, poolId, amount);
    }

    function claimReward(
        uint256 poolId
    )
        external
        nonReentrant
        updateReward(poolId, msg.sender)
        poolExists(poolId)
    {
        uint256 reward = rewards[poolId][msg.sender];
        if (reward > 0) {
            rewards[poolId][msg.sender] = 0;
            pools[poolId].rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, poolId, reward);
        }
    }

    function rewardPerToken(uint256 poolId) public view returns (uint256) {
        Pool storage pool = pools[poolId];

        if (pool.totalStaked == 0) {
            return pool.rewardPerTokenStored;
        }

        return
            pool.rewardPerTokenStored.add(
                block
                    .timestamp
                    .sub(pool.lastUpdateTime)
                    .mul(pool.rewardRate)
                    .mul(REWARD_PRECISION)
                    .div(pool.totalStaked)
            );
    }

    function earned(
        uint256 poolId,
        address account
    ) public view returns (uint256) {
        StakeInfo storage stakeInfo = stakes[poolId][account];

        return
            stakeInfo
                .amount
                .mul(
                    rewardPerToken(poolId).sub(
                        userRewardPerTokenPaid[poolId][account]
                    )
                )
                .div(REWARD_PRECISION)
                .add(rewards[poolId][account]);
    }

    function updateRewardRate(
        uint256 poolId,
        uint256 newRate
    )
        external
        onlyRole(REWARDS_DISTRIBUTOR_ROLE)
        updateReward(poolId, address(0))
        poolExists(poolId)
    {
        pools[poolId].rewardRate = newRate;
        emit RewardRateUpdated(poolId, newRate);
    }

    function getStakeInfo(
        uint256 poolId,
        address account
    )
        external
        view
        returns (
            uint256 amount,
            uint256 stakingTime,
            uint256 earnedRewards,
            bool isActive
        )
    {
        StakeInfo storage stakeInfo = stakes[poolId][account];
        return (
            stakeInfo.amount,
            stakeInfo.stakingTime,
            earned(poolId, account),
            stakeInfo.isActive
        );
    }
}
