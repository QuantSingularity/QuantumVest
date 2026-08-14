// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title Trend Analysis
 * @dev Reads a Chainlink price feed and derives a simple moving average.
 * @author QuantumVest Team
 */
contract TrendAnalysis {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeed) {
        require(_priceFeed != address(0), "Invalid price feed");
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function getPriceTrend() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Computes a simple moving average over the last `window` rounds.
     *
     * BUGFIX: this previously called `priceFeed.latestRound()`, which does
     * not exist on AggregatorV3Interface (it only exists on the older,
     * deprecated AggregatorInterface) — the contract could not compile.
     * The round id is now sourced from `latestRoundData()` instead, and is
     * correctly typed as `uint80` per the interface. A `window == 0` guard
     * and an underflow guard on `roundId - i` were also added, since the
     * original would divide by zero or revert with an unclear arithmetic
     * error when walking past round 0.
     */
    function calculateMA(uint256 window) public view returns (int256) {
        require(window > 0, "Window must be greater than 0");

        (uint80 latestRoundId, , , , ) = priceFeed.latestRoundData();
        require(latestRoundId + 1 >= window, "Not enough historical rounds");

        int256 sum = 0;
        for (uint256 i = 0; i < window; i++) {
            (, int256 answer, , , ) = priceFeed.getRoundData(
                uint80(latestRoundId - i)
            );
            sum += answer;
        }

        return sum / int256(window);
    }
}
