// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Standard Truffle migrations tracker. This contract was referenced by
 * migrations/1_initial_migration.js but did not exist, so the initial
 * migration deployed nothing and `truffle migrate` had no on-chain record
 * of which migrations had already run.
 */
contract Migrations {
    address public owner = msg.sender;
    uint256 public last_completed_migration;

    modifier restricted() {
        require(
            msg.sender == owner,
            "This function is restricted to the contract's owner"
        );
        _;
    }

    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }
}
