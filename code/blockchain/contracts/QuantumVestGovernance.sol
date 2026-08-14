// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title QuantumVest Governance
 * @dev Token-weighted proposal and voting contract.
 * @author QuantumVest Team
 */
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
        require(_governanceToken != address(0), "Invalid governance token");

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
        // BUGFIX: support was never validated. Any value outside {0,1,2}
        // silently fell through the if/else chain below, marking the
        // account as having voted while the vote counted toward nothing.
        require(support <= 2, "Invalid vote type");

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
        } else {
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
