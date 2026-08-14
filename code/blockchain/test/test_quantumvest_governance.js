const QuantumVestGovernance = artifacts.require("QuantumVestGovernance");
const MockERC20 = artifacts.require("MockERC20");

contract("QuantumVestGovernance", (accounts) => {
  const admin = accounts[0];
  const voter1 = accounts[1];
  const voter2 = accounts[2];
  const nonHolder = accounts[3];

  let governance;
  let govToken;

  const ONE_DAY = 24 * 60 * 60;

  async function increaseTime(seconds) {
    await new Promise((resolve) =>
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [seconds],
          id: 0,
        },
        resolve,
      ),
    );
    await new Promise((resolve) =>
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: "evm_mine", params: [], id: 0 },
        resolve,
      ),
    );
  }

  beforeEach(async () => {
    govToken = await MockERC20.new("Gov Token", "GOV", { from: admin });
    governance = await QuantumVestGovernance.new(govToken.address, {
      from: admin,
    });

    // proposalThreshold is 100,000 tokens; mint plenty to admin, then
    // distribute so quorum (4%) is reachable in tests.
    await govToken.mint(admin, web3.utils.toWei("1000000", "ether"));
    await govToken.mint(voter1, web3.utils.toWei("500000", "ether"));
    await govToken.mint(voter2, web3.utils.toWei("500000", "ether"));
  });

  it("rejects a zero-address governance token at deployment", async () => {
    try {
      await QuantumVestGovernance.new(
        "0x0000000000000000000000000000000000000000",
        { from: admin },
      );
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Invalid governance token");
    }
  });

  it("lets a proposer with enough tokens create a proposal", async () => {
    const tx = await governance.propose("Add new asset", "Description", {
      from: admin,
    });
    assert.equal(tx.logs[0].event, "ProposalCreated");
  });

  it("rejects proposals from an account without enough tokens", async () => {
    try {
      await governance.propose("Should fail", "desc", { from: nonHolder });
      assert.fail("Expected revert not received");
    } catch (error) {
      // reverts either on the PROPOSER_ROLE check or the threshold check
      assert.include(error.message, "revert");
    }
  });

  // BUGFIX COVERAGE: castVote previously accepted any uint8 `support`
  // value; anything outside {0,1,2} silently matched none of the
  // for/against/abstain branches while still marking hasVoted = true,
  // discarding the caller's voting power with no error.
  it("rejects an out-of-range vote type", async () => {
    await governance.propose("Add new asset", "Description", {
      from: admin,
    });
    await increaseTime(ONE_DAY + 1);

    try {
      await governance.castVote(1, 3, { from: voter1 });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Invalid vote type");
    }
  });

  it("counts for/against/abstain votes correctly", async () => {
    await governance.propose("Add new asset", "Description", {
      from: admin,
    });
    await increaseTime(ONE_DAY + 1);

    await governance.castVote(1, 1, { from: voter1 }); // for
    await governance.castVote(1, 0, { from: voter2 }); // against

    const votes = await governance.getProposalVotes(1);
    assert.equal(
      votes.forVotes.toString(),
      web3.utils.toWei("500000", "ether"),
    );
    assert.equal(
      votes.againstVotes.toString(),
      web3.utils.toWei("500000", "ether"),
    );
  });

  it("rejects a double vote", async () => {
    await governance.propose("Add new asset", "Description", {
      from: admin,
    });
    await increaseTime(ONE_DAY + 1);

    await governance.castVote(1, 1, { from: voter1 });
    try {
      await governance.castVote(1, 0, { from: voter1 });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert.include(error.message, "Already voted");
    }
  });

  it("executes a proposal that reaches quorum and passes", async () => {
    await governance.propose("Add new asset", "Description", {
      from: admin,
    });
    await increaseTime(ONE_DAY + 1);

    await governance.castVote(1, 1, { from: admin }); // 1,000,000 for
    await governance.castVote(1, 1, { from: voter1 }); // 500,000 for
    await governance.castVote(1, 0, { from: voter2 }); // 500,000 against

    await increaseTime(7 * ONE_DAY + 1);

    await governance.executeProposal(1, { from: admin });
    const proposal = await governance.proposals(1);
    assert.isTrue(proposal.executed);
  });
});
