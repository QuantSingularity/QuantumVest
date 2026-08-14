// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockV3Aggregator
 * @dev Minimal Chainlink AggregatorV3Interface mock used only for local
 * development/testing. TrendAnalysis's migrated instance points at a real
 * mainnet feed, which does not exist on a local chain, so tests deploy
 * their own TrendAnalysis pointed at this mock instead.
 */
contract MockV3Aggregator is AggregatorV3Interface {
    uint8 public immutable override decimals;
    string public override description = "Mock Aggregator";
    uint256 public override version = 0;

    uint80 private latestRoundId;
    mapping(uint80 => int256) private answers;
    mapping(uint80 => uint256) private timestamps;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        _pushAnswer(_initialAnswer);
    }

    function updateAnswer(int256 _answer) public {
        _pushAnswer(_answer);
    }

    function _pushAnswer(int256 _answer) internal {
        latestRoundId += 1;
        answers[latestRoundId] = _answer;
        timestamps[latestRoundId] = block.timestamp;
    }

    function getRoundData(
        uint80 _roundId
    )
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId >= 1 && _roundId <= latestRoundId, "No data present");
        return (
            _roundId,
            answers[_roundId],
            timestamps[_roundId],
            timestamps[_roundId],
            _roundId
        );
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            latestRoundId,
            answers[latestRoundId],
            timestamps[latestRoundId],
            timestamps[latestRoundId],
            latestRoundId
        );
    }
}
