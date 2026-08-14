// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Portfolio Manager
 * @dev Manages user investment portfolios, supported assets and fees.
 * @author QuantumVest Team
 */
contract PortfolioManager is ReentrancyGuard, AccessControl {
    using SafeMath for uint256;
    // BUGFIX: token transfer return values were never checked, so a
    // non-reverting ERC20 that returns `false` on failure would silently
    // "succeed" while moving no tokens. SafeERC20 reverts on failure.
    using SafeERC20 for IERC20;

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
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_priceOracle != address(0), "Invalid price oracle");

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
        IERC20(assetAddress).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

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
        IERC20(assetAddress).safeTransfer(msg.sender, amount);

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
        require(tokenAddress != address(0), "Invalid token address");

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
