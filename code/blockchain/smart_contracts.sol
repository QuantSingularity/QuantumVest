// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title QuantumVest Smart Contracts
 * @dev Comprehensive smart contract suite for financial operations
 * @author QuantumVest Team
 */

// ============================================================================
// Core Token Contract
// ============================================================================

contract QuantumVestToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    using SafeMath for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10 ** 18; // 100 million tokens

    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public vestingSchedule;
    mapping(address => uint256) public lastTransferTime;

    uint256 public transferCooldown = 1 hours;
    bool public complianceEnabled = true;

    event BlacklistUpdated(address indexed account, bool isBlacklisted);
    event VestingScheduleSet(address indexed account, uint256 vestingPeriod);
    event ComplianceToggled(bool enabled);

    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "Account is blacklisted");
        _;
    }

    modifier complianceCheck(address from, address to) {
        if (complianceEnabled) {
            require(
                !blacklisted[from] && !blacklisted[to],
                "Compliance violation"
            );
            require(
                block.timestamp >= lastTransferTime[from].add(transferCooldown),
                "Transfer cooldown active"
            );
        }
        _;
    }

    constructor() ERC20("QuantumVest Token", "QVT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);

        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(totalSupply().add(amount) <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setBlacklist(
        address account,
        bool isBlacklisted
    ) public onlyRole(COMPLIANCE_ROLE) {
        blacklisted[account] = isBlacklisted;
        emit BlacklistUpdated(account, isBlacklisted);
    }

    function setVestingSchedule(
        address account,
        uint256 vestingPeriod
    ) public onlyRole(COMPLIANCE_ROLE) {
        vestingSchedule[account] = vestingPeriod;
        emit VestingScheduleSet(account, vestingPeriod);
    }

    function toggleCompliance() public onlyRole(COMPLIANCE_ROLE) {
        complianceEnabled = !complianceEnabled;
        emit ComplianceToggled(complianceEnabled);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused complianceCheck(from, to) {
        super._beforeTokenTransfer(from, to, amount);

        if (from != address(0)) {
            lastTransferTime[from] = block.timestamp;
        }
    }
}

// ============================================================================
// Portfolio Management Contract
// ============================================================================

contract PortfolioManager is ReentrancyGuard, AccessControl {
    using SafeMath for uint256;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct Portfolio {
        address owner;
        string name;
        uint256 totalValue;
        uint256 createdAt;
        bool isActive;
        mapping(address => uint256) assetBalances;
        address[] assetList;
    }

    struct Asset {
        address tokenAddress;
        string symbol;
        uint256 decimals;
        bool isActive;
        uint256 priceOracle;
        uint256 lastUpdated;
    }

    mapping(uint256 => Portfolio) public portfolios;
    mapping(address => Asset) public supportedAssets;
    mapping(address => uint256[]) public userPortfolios;

    uint256 public portfolioCounter;
    uint256 public managementFee = 200; // 2% in basis points
    uint256 public performanceFee = 2000; // 20% in basis points

    address public feeCollector;
    address public priceOracle;

    event PortfolioCreated(
        uint256 indexed portfolioId,
        address indexed owner,
        string name
    );
    event AssetAdded(
        uint256 indexed portfolioId,
        address indexed asset,
        uint256 amount
    );
    event AssetRemoved(
        uint256 indexed portfolioId,
        address indexed asset,
        uint256 amount
    );
    event PortfolioRebalanced(
        uint256 indexed portfolioId,
        uint256 newTotalValue
    );
    event FeesCollected(
        uint256 indexed portfolioId,
        uint256 managementFee,
        uint256 performanceFee
    );

    modifier onlyPortfolioOwner(uint256 portfolioId) {
        require(
            portfolios[portfolioId].owner == msg.sender,
            "Not portfolio owner"
        );
        _;
    }

    modifier portfolioExists(uint256 portfolioId) {
        require(
            portfolios[portfolioId].owner != address(0),
            "Portfolio does not exist"
        );
        _;
    }

    constructor(address _feeCollector, address _priceOracle) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);

        feeCollector = _feeCollector;
        priceOracle = _priceOracle;
    }

    function createPortfolio(string memory name) external returns (uint256) {
        portfolioCounter = portfolioCounter.add(1);
        uint256 portfolioId = portfolioCounter;

        Portfolio storage portfolio = portfolios[portfolioId];
        portfolio.owner = msg.sender;
        portfolio.name = name;
        portfolio.totalValue = 0;
        portfolio.createdAt = block.timestamp;
        portfolio.isActive = true;

        userPortfolios[msg.sender].push(portfolioId);

        emit PortfolioCreated(portfolioId, msg.sender, name);
        return portfolioId;
    }

    function addAsset(
        uint256 portfolioId,
        address assetAddress,
        uint256 amount
    )
        external
        portfolioExists(portfolioId)
        onlyPortfolioOwner(portfolioId)
        nonReentrant
    {
        require(supportedAssets[assetAddress].isActive, "Asset not supported");
        require(amount > 0, "Amount must be greater than 0");

        Portfolio storage portfolio = portfolios[portfolioId];

        // Transfer tokens to contract
        IERC20(assetAddress).transferFrom(msg.sender, address(this), amount);

        // Update portfolio
        if (portfolio.assetBalances[assetAddress] == 0) {
            portfolio.assetList.push(assetAddress);
        }

        portfolio.assetBalances[assetAddress] = portfolio
            .assetBalances[assetAddress]
            .add(amount);

        // Update total value
        uint256 assetValue = getAssetValue(assetAddress, amount);
        portfolio.totalValue = portfolio.totalValue.add(assetValue);

        emit AssetAdded(portfolioId, assetAddress, amount);
    }

    function removeAsset(
        uint256 portfolioId,
        address assetAddress,
        uint256 amount
    )
        external
        portfolioExists(portfolioId)
        onlyPortfolioOwner(portfolioId)
        nonReentrant
    {
        Portfolio storage portfolio = portfolios[portfolioId];
        require(
            portfolio.assetBalances[assetAddress] >= amount,
            "Insufficient balance"
        );

        // Update portfolio
        portfolio.assetBalances[assetAddress] = portfolio
            .assetBalances[assetAddress]
            .sub(amount);

        // Remove from asset list if balance is zero
        if (portfolio.assetBalances[assetAddress] == 0) {
            _removeFromAssetList(portfolioId, assetAddress);
        }

        // Update total value
        uint256 assetValue = getAssetValue(assetAddress, amount);
        portfolio.totalValue = portfolio.totalValue.sub(assetValue);

        // Transfer tokens back to owner
        IERC20(assetAddress).transfer(msg.sender, amount);

        emit AssetRemoved(portfolioId, assetAddress, amount);
    }

    function rebalancePortfolio(
        uint256 portfolioId,
        address[] memory assets,
        uint256[] memory targetWeights
    )
        external
        portfolioExists(portfolioId)
        onlyPortfolioOwner(portfolioId)
        onlyRole(MANAGER_ROLE)
    {
        require(
            assets.length == targetWeights.length,
            "Arrays length mismatch"
        );

        Portfolio storage portfolio = portfolios[portfolioId];
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < targetWeights.length; i++) {
            totalWeight = totalWeight.add(targetWeights[i]);
        }

        require(totalWeight == 10000, "Total weight must equal 100%"); // 10000 basis points = 100%

        // Calculate new total value
        uint256 newTotalValue = calculatePortfolioValue(portfolioId);
        portfolio.totalValue = newTotalValue;

        emit PortfolioRebalanced(portfolioId, newTotalValue);
    }

    function calculatePortfolioValue(
        uint256 portfolioId
    ) public view returns (uint256) {
        Portfolio storage portfolio = portfolios[portfolioId];
        uint256 totalValue = 0;

        for (uint256 i = 0; i < portfolio.assetList.length; i++) {
            address asset = portfolio.assetList[i];
            uint256 balance = portfolio.assetBalances[asset];
            uint256 assetValue = getAssetValue(asset, balance);
            totalValue = totalValue.add(assetValue);
        }

        return totalValue;
    }

    function getAssetValue(
        address assetAddress,
        uint256 amount
    ) public view returns (uint256) {
        Asset memory asset = supportedAssets[assetAddress];
        require(asset.isActive, "Asset not supported");

        // In a real implementation, this would query an oracle
        return amount.mul(asset.priceOracle).div(10 ** asset.decimals);
    }

    function addSupportedAsset(
        address tokenAddress,
        string memory symbol,
        uint256 decimals,
        uint256 initialPrice
    ) external onlyRole(MANAGER_ROLE) {
        supportedAssets[tokenAddress] = Asset({
            tokenAddress: tokenAddress,
            symbol: symbol,
            decimals: decimals,
            isActive: true,
            priceOracle: initialPrice,
            lastUpdated: block.timestamp
        });
    }

    function updateAssetPrice(
        address assetAddress,
        uint256 newPrice
    ) external onlyRole(MANAGER_ROLE) {
        require(supportedAssets[assetAddress].isActive, "Asset not supported");
        supportedAssets[assetAddress].priceOracle = newPrice;
        supportedAssets[assetAddress].lastUpdated = block.timestamp;
    }

    function collectFees(
        uint256 portfolioId
    ) external onlyRole(MANAGER_ROLE) portfolioExists(portfolioId) {
        Portfolio storage portfolio = portfolios[portfolioId];
        uint256 totalValue = calculatePortfolioValue(portfolioId);

        uint256 managementFeeAmount = totalValue.mul(managementFee).div(10000);
        uint256 performanceFeeAmount = 0;

        // Calculate performance fee if portfolio has gained value
        if (totalValue > portfolio.totalValue) {
            uint256 profit = totalValue.sub(portfolio.totalValue);
            performanceFeeAmount = profit.mul(performanceFee).div(10000);
        }

        emit FeesCollected(
            portfolioId,
            managementFeeAmount,
            performanceFeeAmount
        );
    }

    function getUserPortfolios(
        address user
    ) external view returns (uint256[] memory) {
        return userPortfolios[user];
    }

    function getPortfolioAssets(
        uint256 portfolioId
    ) external view returns (address[] memory, uint256[] memory) {
        Portfolio storage portfolio = portfolios[portfolioId];
        uint256[] memory balances = new uint256[](portfolio.assetList.length);

        for (uint256 i = 0; i < portfolio.assetList.length; i++) {
            balances[i] = portfolio.assetBalances[portfolio.assetList[i]];
        }

        return (portfolio.assetList, balances);
    }

    function _removeFromAssetList(
        uint256 portfolioId,
        address assetAddress
    ) internal {
        Portfolio storage portfolio = portfolios[portfolioId];

        for (uint256 i = 0; i < portfolio.assetList.length; i++) {
            if (portfolio.assetList[i] == assetAddress) {
                portfolio.assetList[i] = portfolio.assetList[
                    portfolio.assetList.length - 1
                ];
                portfolio.assetList.pop();
                break;
            }
        }
    }
}

// ============================================================================
// Staking and Rewards Contract
// ============================================================================

contract QuantumVestStaking is ReentrancyGuard, AccessControl {
    using SafeMath for uint256;

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
        pool.stakingToken.transferFrom(msg.sender, address(this), amount);

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
        pool.stakingToken.transfer(msg.sender, amount);

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
            pools[poolId].rewardToken.transfer(msg.sender, reward);
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

// ============================================================================
// Governance Contract
// ============================================================================

contract QuantumVestGovernance is AccessControl {
    using SafeMath for uint256;

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
        mapping(address => bool) hasVoted;
        mapping(address => uint8) votes; // 0: Against, 1: For, 2: Abstain
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCounter;

    IERC20 public governanceToken;
    uint256 public votingDelay = 1 days;
    uint256 public votingPeriod = 7 days;
    uint256 public proposalThreshold = 100000 * 10 ** 18; // 100k tokens
    uint256 public quorumThreshold = 4; // 4% of total supply

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight
    );

    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);

    modifier onlyTokenHolder() {
        require(
            governanceToken.balanceOf(msg.sender) > 0,
            "Must hold governance tokens"
        );
        _;
    }

    constructor(address _governanceToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSER_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);

        governanceToken = IERC20(_governanceToken);
    }

    function propose(
        string memory title,
        string memory description
    ) external onlyRole(PROPOSER_ROLE) returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) >= proposalThreshold,
            "Insufficient tokens to propose"
        );

        proposalCounter = proposalCounter.add(1);
        uint256 proposalId = proposalCounter;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.startTime = block.timestamp.add(votingDelay);
        proposal.endTime = proposal.startTime.add(votingPeriod);

        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            proposal.startTime,
            proposal.endTime
        );

        return proposalId;
    }

    function castVote(
        uint256 proposalId,
        uint8 support
    ) external onlyTokenHolder {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        proposal.hasVoted[msg.sender] = true;
        proposal.votes[msg.sender] = support;

        if (support == 0) {
            proposal.againstVotes = proposal.againstVotes.add(weight);
        } else if (support == 1) {
            proposal.forVotes = proposal.forVotes.add(weight);
        } else if (support == 2) {
            proposal.abstainVotes = proposal.abstainVotes.add(weight);
        }

        emit VoteCast(msg.sender, proposalId, support, weight);
    }

    function executeProposal(
        uint256 proposalId
    ) external onlyRole(EXECUTOR_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Proposal canceled");

        uint256 totalVotes = proposal.forVotes.add(proposal.againstVotes).add(
            proposal.abstainVotes
        );
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 quorum = totalSupply.mul(quorumThreshold).div(100);

        require(totalVotes >= quorum, "Quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "Proposal rejected");

        proposal.executed = true;

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(
            msg.sender == proposal.proposer ||
                hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to cancel"
        );
        require(!proposal.executed, "Already executed");
        require(!proposal.canceled, "Already canceled");

        proposal.canceled = true;

        emit ProposalCanceled(proposalId);
    }

    function getProposalVotes(
        uint256 proposalId
    )
        external
        view
        returns (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes)
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes
        );
    }

    function hasVoted(
        uint256 proposalId,
        address voter
    ) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    function getVote(
        uint256 proposalId,
        address voter
    ) external view returns (uint8) {
        require(proposals[proposalId].hasVoted[voter], "Voter has not voted");
        return proposals[proposalId].votes[voter];
    }
}

// ============================================================================
// Price Oracle Contract
// ============================================================================

contract QuantumVestOracle is AccessControl {
    using SafeMath for uint256;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;
        bool isValid;
    }

    mapping(address => PriceData) public assetPrices;
    mapping(address => address[]) public priceFeeds; // Multiple feeds per asset

    uint256 public constant PRICE_VALIDITY_PERIOD = 1 hours;
    uint256 public constant MIN_CONFIDENCE = 80; // 80%

    event PriceUpdated(
        address indexed asset,
        uint256 price,
        uint256 timestamp,
        uint256 confidence
    );
    event PriceFeedAdded(address indexed asset, address indexed feed);

    modifier onlyValidPrice(address asset) {
        PriceData storage data = assetPrices[asset];
        require(data.isValid, "Price not available");
        require(
            block.timestamp.sub(data.timestamp) <= PRICE_VALIDITY_PERIOD,
            "Price data stale"
        );
        require(data.confidence >= MIN_CONFIDENCE, "Price confidence too low");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function updatePrice(
        address asset,
        uint256 price,
        uint256 confidence
    ) external onlyRole(ORACLE_ROLE) {
        require(confidence <= 100, "Invalid confidence level");

        assetPrices[asset] = PriceData({
            price: price,
            timestamp: block.timestamp,
            confidence: confidence,
            isValid: true
        });

        emit PriceUpdated(asset, price, block.timestamp, confidence);
    }

    function getPrice(
        address asset
    ) external view onlyValidPrice(asset) returns (uint256) {
        return assetPrices[asset].price;
    }

    function getPriceWithTimestamp(
        address asset
    )
        external
        view
        onlyValidPrice(asset)
        returns (uint256 price, uint256 timestamp)
    {
        PriceData storage data = assetPrices[asset];
        return (data.price, data.timestamp);
    }

    function isPriceValid(address asset) external view returns (bool) {
        PriceData storage data = assetPrices[asset];
        return
            data.isValid &&
            block.timestamp.sub(data.timestamp) <= PRICE_VALIDITY_PERIOD &&
            data.confidence >= MIN_CONFIDENCE;
    }

    function addPriceFeed(
        address asset,
        address feed
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceFeeds[asset].push(feed);
        emit PriceFeedAdded(asset, feed);
    }

    function aggregatePrices(address asset) external onlyRole(ORACLE_ROLE) {
        address[] memory feeds = priceFeeds[asset];
        require(feeds.length > 0, "No price feeds available");

        uint256 totalPrice = 0;
        uint256 validFeeds = 0;

        // Simple average aggregation (in production, use more sophisticated methods)
        for (uint256 i = 0; i < feeds.length; i++) {
            // This would call external price feeds
            // For now, we'll use a placeholder
            totalPrice = totalPrice.add(assetPrices[asset].price);
            validFeeds = validFeeds.add(1);
        }

        if (validFeeds > 0) {
            uint256 aggregatedPrice = totalPrice.div(validFeeds);
            uint256 confidence = validFeeds.mul(100).div(feeds.length);

            updatePrice(asset, aggregatedPrice, confidence);
        }
    }
}
