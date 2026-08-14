// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Plain, freely mintable ERC20 used only in the test suite as a
 * staking/portfolio asset token, so tests aren't coupled to
 * QuantumVestToken's compliance/vesting/cooldown rules.
 */
contract MockERC20 is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
