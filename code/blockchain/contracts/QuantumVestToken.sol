// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title QuantumVest Token
 * @dev ERC20 governance / utility token with compliance, blacklist and
 *      vesting controls for the QuantumVest platform.
 * @author QuantumVest Team
 */
contract QuantumVestToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    using SafeMath for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10 ** 18; // 100 million tokens

    mapping(address => bool) public blacklisted;
    // Timestamp before which an account's tokens are locked (0 = no vesting).
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

        // BUGFIX: vestingSchedule was recorded (setVestingSchedule/VestingScheduleSet)
        // but never actually enforced anywhere, so it had no effect on transfers.
        // Block outgoing transfers from an account still inside its vesting period.
        // Minting (from == address(0)) is intentionally exempt so vested tokens can
        // still be issued to the beneficiary.
        if (from != address(0)) {
            require(
                block.timestamp >= vestingSchedule[from],
                "Tokens are still vesting"
            );
            lastTransferTime[from] = block.timestamp;
        }
    }
}
