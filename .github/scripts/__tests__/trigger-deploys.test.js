const {
  triggerDeploys,
  matchDeployTargets,
  loadConfig,
} = require("../trigger-deploys");

// Load config once for test assertions
const config = loadConfig();

// Helper to create mock github/context/core objects
function createMocks({
  targetBranch = "main",
  changedFiles = [],
  headSha = "abc123def456",
} = {}) {
  const dispatch = jest.fn();
  const github = {
    rest: {
      pulls: {
        get: jest.fn().mockResolvedValue({
          data: {
            base: { ref: targetBranch },
            head: { sha: headSha },
          },
        }),
        listFiles: {},
      },
      actions: { createWorkflowDispatch: dispatch },
    },
    paginate: jest
      .fn()
      .mockResolvedValue(changedFiles.map((f) => ({ filename: f }))),
  };
  const context = {
    repo: { owner: "test-owner", repo: "test-repo" },
    issue: { number: 42 },
  };
  const core = { setFailed: jest.fn() };
  return { github, context, core, dispatch };
}

describe("loadConfig", () => {
  test("loads deploy.config.json from project root", () => {
    expect(config.deployBranches).toEqual(["main", "staging"]);
    expect(config.deployTargets).toHaveLength(2);
  });

  test("config has backend and frontend targets", () => {
    const names = config.deployTargets.map((t) => t.name);
    expect(names).toEqual(["backend", "frontend"]);
  });
});

describe("matchDeployTargets", () => {
  test("matches backend paths", () => {
    const matched = matchDeployTargets(
      ["src/cashier_backend/lib.rs"],
      config.deployTargets
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("backend");
  });

  test("matches frontend paths", () => {
    const matched = matchDeployTargets(
      ["src/cashier_frontend_new/index.ts"],
      config.deployTargets
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("frontend");
  });

  test("matches both when files span both", () => {
    const matched = matchDeployTargets(
      [
        "src/cashier_backend/main.rs",
        "src/cashier_frontend_new/App.svelte",
      ],
      config.deployTargets
    );
    expect(matched).toHaveLength(2);
  });

  test("matches none for unrelated paths", () => {
    const matched = matchDeployTargets(
      ["README.md", "docs/guide.md"],
      config.deployTargets
    );
    expect(matched).toHaveLength(0);
  });

  test("src/shared triggers both backend and frontend", () => {
    const matched = matchDeployTargets(
      ["src/shared/utils.rs"],
      config.deployTargets
    );
    expect(matched).toHaveLength(2);
    const names = matched.map((t) => t.name);
    expect(names).toContain("backend");
    expect(names).toContain("frontend");
  });

  test("workflow file change triggers deploy", () => {
    const matched = matchDeployTargets(
      [".github/workflows/orbit-backend-deploy.yml"],
      config.deployTargets
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("backend");
  });

  test("token_storage triggers backend deploy", () => {
    const matched = matchDeployTargets(
      ["src/token_storage/src/lib.rs"],
      config.deployTargets
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("backend");
  });

  test("transaction_manager triggers backend deploy", () => {
    const matched = matchDeployTargets(
      ["src/transaction_manager/src/main.rs"],
      config.deployTargets
    );
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe("backend");
  });
});

describe("triggerDeploys", () => {
  test("skips non-deploy branches", async () => {
    const { github, context, core, dispatch } = createMocks({
      targetBranch: "dev",
      changedFiles: ["src/cashier_backend/lib.rs"],
    });
    await triggerDeploys({ github, context, core });
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("dispatches backend workflow for backend changes", async () => {
    const { github, context, core, dispatch } = createMocks({
      targetBranch: "main",
      changedFiles: ["src/cashier_backend/lib.rs"],
    });
    await triggerDeploys({ github, context, core });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_id: "orbit-backend-deploy.yml",
        ref: "main",
      })
    );
  });

  test("dispatches frontend workflow for frontend changes", async () => {
    const { github, context, core, dispatch } = createMocks({
      targetBranch: "staging",
      changedFiles: ["src/cashier_frontend_new/index.ts"],
    });
    await triggerDeploys({ github, context, core });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_id: "orbit-frontend-deploy.yml",
        ref: "staging",
      })
    );
  });

  test("dispatches both workflows when both changed", async () => {
    const { github, context, core, dispatch } = createMocks({
      targetBranch: "main",
      changedFiles: [
        "src/cashier_backend/lib.rs",
        "src/cashier_frontend_new/App.svelte",
      ],
    });
    await triggerDeploys({ github, context, core });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  test("dispatches nothing when no deploy paths match", async () => {
    const { github, context, core, dispatch } = createMocks({
      targetBranch: "main",
      changedFiles: ["README.md", "docs/guide.md"],
    });
    await triggerDeploys({ github, context, core });
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("passes PR head SHA as dispatch input to avoid stale checkout", async () => {
    const { github, context, core, dispatch } = createMocks({
      targetBranch: "main",
      changedFiles: ["src/cashier_backend/lib.rs"],
      headSha: "deadbeefcafe1234",
    });
    await triggerDeploys({ github, context, core });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: { sha: "deadbeefcafe1234" },
      })
    );
  });
});
