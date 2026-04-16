// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TrendAnalysis {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getPriceTrend() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    function calculateMA(uint256 window) public view returns (int256) {
        uint256 roundId = priceFeed.latestRound();
        int256 sum = 0;

        for (uint256 i = 0; i < window; i++) {
            (, int256 answer, , , ) = priceFeed.getRoundData(roundId - i);
            sum += answer;
        }
        return sum / int256(window);
    }
}
