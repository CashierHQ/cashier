const {
  checkCiStatus,
  filterPrChecks,
  categorizeChecks,
} = require("../check-ci-status");

// Helper: create mock github/context/core
function createMocks({
  draft = false,
  mergeable = true,
  headSha = "abc123",
  checkRuns = [],
} = {}) {
  const createComment = jest.fn();
  const github = {
    rest: {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: { draft, mergeable, head: { sha: headSha } },
        }),
      },
      checks: {
        listForRef: jest.fn().mockResolvedValue({
          data: { check_runs: checkRuns },
        }),
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

// Sample check run factory
function makeCheck({ name, status = "completed", conclusion = "success", prNumber = 42 }) {
  return {
    name,
    status,
    conclusion,
    pull_requests: prNumber ? [{ number: prNumber }] : [],
  };
}

describe("filterPrChecks", () => {
  test("excludes self-named check (fast-forward)", () => {
    const checks = [
      makeCheck({ name: "fast-forward" }),
      makeCheck({ name: "build" }),
    ];
    const result = filterPrChecks(checks, 42);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("build");
  });

  test("excludes checks not linked to this PR", () => {
    const checks = [makeCheck({ name: "build", prNumber: 99 })];
    const result = filterPrChecks(checks, 42);
    expect(result).toHaveLength(0);
  });

  test("includes checks linked to this PR", () => {
    const checks = [
      makeCheck({ name: "build", prNumber: 42 }),
      makeCheck({ name: "lint", prNumber: 42 }),
    ];
    const result = filterPrChecks(checks, 42);
    expect(result).toHaveLength(2);
  });

  test("handles empty check list", () => {
    const result = filterPrChecks([], 42);
    expect(result).toHaveLength(0);
  });
});

describe("categorizeChecks", () => {
  test("categorizes completed+success as passed", () => {
    const checks = [makeCheck({ name: "build", conclusion: "success" })];
    const { passed, failed, pending } = categorizeChecks(checks);
    expect(passed).toHaveLength(1);
    expect(failed).toHaveLength(0);
    expect(pending).toHaveLength(0);
  });

  test("categorizes completed+failure as failed", () => {
    const checks = [makeCheck({ name: "build", conclusion: "failure" })];
    const { passed, failed, pending } = categorizeChecks(checks);
    expect(failed).toHaveLength(1);
    expect(passed).toHaveLength(0);
  });

  test("categorizes completed+skipped as passed", () => {
    const checks = [makeCheck({ name: "deploy", conclusion: "skipped" })];
    const { passed, failed } = categorizeChecks(checks);
    expect(passed).toHaveLength(1);
    expect(failed).toHaveLength(0);
  });

  test("categorizes in_progress as pending", () => {
    const checks = [
      makeCheck({ name: "build", status: "in_progress", conclusion: null }),
    ];
    const { pending } = categorizeChecks(checks);
    expect(pending).toHaveLength(1);
  });
});

describe("checkCiStatus", () => {
  test("fails on draft PR", async () => {
    const { github, context, core, createComment } = createMocks({
      draft: true,
    });
    await checkCiStatus({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith("Cannot merge draft PR");
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("still in draft"),
      })
    );
  });

  test("fails on merge conflict", async () => {
    const { github, context, core, createComment } = createMocks({
      mergeable: false,
    });
    await checkCiStatus({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith("PR has merge conflicts");
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("merge conflicts"),
      })
    );
  });

  test("warns but continues when mergeable is null", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const { github, context, core } = createMocks({
      mergeable: null,
      checkRuns: [],
    });
    await checkCiStatus({ github, context, core });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Mergeable status not yet computed")
    );
    expect(core.setFailed).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("fails when CI checks still pending", async () => {
    const { github, context, core } = createMocks({
      checkRuns: [
        makeCheck({ name: "build", status: "in_progress", conclusion: null }),
      ],
    });
    await checkCiStatus({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("CI checks still running")
    );
  });

  test("fails when CI checks failed", async () => {
    const { github, context, core } = createMocks({
      checkRuns: [makeCheck({ name: "build", conclusion: "failure" })],
    });
    await checkCiStatus({ github, context, core });
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining("CI checks failed")
    );
  });

  test("passes when all checks succeeded", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const { github, context, core } = createMocks({
      checkRuns: [
        makeCheck({ name: "build", conclusion: "success" }),
        makeCheck({ name: "lint", conclusion: "success" }),
      ],
    });
    await checkCiStatus({ github, context, core });
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("All CI checks passed!");
    consoleSpy.mockRestore();
  });
});
