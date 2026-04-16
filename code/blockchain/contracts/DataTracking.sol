// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DataTracking {
    struct MarketData {
        uint256 timestamp;
        uint256 price;
        uint256 volume;
    }

    mapping(string => MarketData[]) public assetData; // Ticker => Data
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    event NewData(string indexed ticker, uint256 price, uint256 volume);

    function addDataPoint(
        string memory ticker,
        uint256 price,
        uint256 volume
    ) external {
        require(msg.sender == owner, "Unauthorized");
        assetData[ticker].push(MarketData(block.timestamp, price, volume));
        emit NewData(ticker, price, volume);
    }

    function getHistoricalData(
        string memory ticker
    ) external view returns (MarketData[] memory) {
        return assetData[ticker];
    }
}
