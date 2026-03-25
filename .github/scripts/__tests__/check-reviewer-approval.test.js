const {
  checkReviewerApproval,
  getLatestReviews,
  computeApprovalStatus,
  buildFailureMessage,
} = require("../check-reviewer-approval");

// Helper: create mock review object
function makeReview({ login, state, type = "User" }) {
  return { user: { login, type }, state };
}

// Helper: create mock github/context/core
function createMocks({ requestedReviewers = [], reviews = [] } = {}) {
  const createComment = jest.fn();
  const github = {
    rest: {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            requested_reviewers: requestedReviewers.map((r) => ({ login: r })),
          },
        }),
        listReviews: jest.fn().mockResolvedValue({ data: reviews }),
      },
      issues: { createComment },
    },
  };
  const context = {
    repo: { owner: "test-owner", repo: "test-repo" },
    issue: { number: 42 },
  };
  const core = { setFailed: jest.fn() };
  return { github, context, core, createComment };
}

describe("getLatestReviews", () => {
  test("skips bot reviews", () => {
    const reviews = [
      makeReview({ login: "bot", state: "APPROVED", type: "Bot" }),
      makeReview({ login: "alice", state: "APPROVED" }),
    ];
    const result = getLatestReviews(reviews);
    expect(result).toEqual({ alice: "APPROVED" });
  });

  test("skips COMMENTED reviews", () => {
    const reviews = [
      makeReview({ login: "alice", state: "COMMENTED" }),
    ];
    const result = getLatestReviews(reviews);
    expect(result).toEqual({});
  });

  test("latest review per user wins", () => {
    const reviews = [
      makeReview({ login: "alice", state: "CHANGES_REQUESTED" }),
      makeReview({ login: "alice", state: "APPROVED" }),
    ];
    const result = getLatestReviews(reviews);
    expect(result).toEqual({ alice: "APPROVED" });
  });

  test("handles empty reviews array", () => {
    const result = getLatestReviews([]);
    expect(result).toEqual({});
  });
});

describe("computeApprovalStatus", () => {
  test("all approved — notApproved empty", () => {
    const status = computeApprovalStatus([], { alice: "APPROVED", bob: "APPROVED" });
    expect(status.notApproved).toHaveLength(0);
    expect(status.approvers).toEqual(["alice", "bob"]);
  });

  test("one pending, one approved — notApproved contains pending", () => {
    const status = computeApprovalStatus(["bob"], { alice: "APPROVED" });
    expect(status.notApproved).toEqual(["bob"]);
    expect(status.pendingList).toEqual(["bob"]);
  });

  test("one rejected — in rejectedList", () => {
    const status = computeApprovalStatus([], {
      alice: "APPROVED",
      bob: "CHANGES_REQUESTED",
    });
    expect(status.rejectedList).toEqual(["bob"]);
    expect(status.approvers).toEqual(["alice"]);
  });

  test("no reviewers at all — allAssigned empty", () => {
    const status = computeApprovalStatus([], {});
    expect(status.allAssigned).toHaveLength(0);
  });
});

describe("buildFailureMessage", () => {
  test("shows Waiting for review section for pending", () => {
    const msg = buildFailureMessage(["alice"], [], []);
    expect(msg).toContain("Waiting for review");
    expect(msg).toContain("@alice");
  });

  test("shows Has not approved section for rejected", () => {
    const msg = buildFailureMessage([], ["bob"], []);
    expect(msg).toContain("Has not approved");
    expect(msg).toContain("@bob");
  });

  test("shows Already approved for partial approval", () => {
    const msg = buildFailureMessage(["bob"], [], ["alice"]);
    expect(msg).toContain("Already approved: alice");
  });

  test("handles all combinations", () => {
    const msg = buildFailureMessage(["charlie"], ["bob"], ["alice"]);
    expect(msg).toContain("Waiting for review");
    expect(msg).toContain("@charlie");
    expect(msg).toContain("Has not approved");
    expect(msg).toContain("@bob");
    expect(msg).toContain("Already approved: alice");
  });
});

describe("checkReviewerApproval", () => {
  test("fails when no reviewers assigned", async () => {
    const { github, context, core, createComment } = createMocks();
    await checkReviewerApproval({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith("No reviewers assigned");
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("No reviewers assigned"),
      })
    );
  });

  test("fails when reviewer pending — posts comment with names", async () => {
    const { github, context, core, createComment } = createMocks({
      requestedReviewers: ["alice"],
    });
    await checkReviewerApproval({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith("Not all reviewers approved");
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("@alice"),
      })
    );
  });

  test("fails when reviewer rejected — posts detailed comment", async () => {
    const { github, context, core, createComment } = createMocks({
      reviews: [
        makeReview({ login: "bob", state: "CHANGES_REQUESTED" }),
      ],
    });
    await checkReviewerApproval({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith("Not all reviewers approved");
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Has not approved"),
      })
    );
  });

  test("passes when all reviewers approved", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const { github, context, core } = createMocks({
      reviews: [makeReview({ login: "alice", state: "APPROVED" })],
    });
    await checkReviewerApproval({ github, context, core });
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("All reviewers approved!");
    consoleSpy.mockRestore();
  });
});
