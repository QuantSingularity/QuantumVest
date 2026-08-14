// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title QuantumVest Oracle
 * @dev On-chain price registry with staleness and confidence guards.
 * @author QuantumVest Team
 */
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
    ) public onlyRole(ORACLE_ROLE) {
        require(asset != address(0), "Invalid asset");
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
        require(asset != address(0) && feed != address(0), "Invalid address");
        priceFeeds[asset].push(feed);
        emit PriceFeedAdded(asset, feed);
    }

    // NOTE: this aggregates the single already-stored price across the
    // configured feed count as a placeholder; a production deployment
    // should have each feed's live price fetched and averaged rather than
    // re-reading assetPrices[asset] in the loop.
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
