const fs = require("fs");
const path = require("path");

// Load deploy config from project root (deploy.config.json)
function loadConfig() {
  const configPath = path.resolve(__dirname, "../../deploy.config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

/**
 * Get all changed files from a PR, handling pagination for large PRs.
 */
async function getChangedFiles(github, owner, repo, pullNumber) {
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return files.map((f) => f.filename);
}

/**
 * Determine which deploy workflows to trigger based on changed file paths.
 * Returns array of deploy target objects that matched.
 */
function matchDeployTargets(changedPaths, targets) {
  return targets.filter((target) =>
    changedPaths.some((filePath) =>
      target.paths.some((prefix) => filePath.startsWith(prefix))
    )
  );
}

/**
 * Main entry point for GitHub Actions.
 * Checks PR target branch, gets changed files, dispatches matching deploy workflows.
 */
async function triggerDeploys({ github, context, core }) {
  const config = loadConfig();
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const pullNumber = context.issue.number;

  // Get PR target branch
  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });

  const targetBranch = pr.base.ref;
  if (!config.deployBranches.includes(targetBranch)) {
    console.log(`Skipping deploy for branch: ${targetBranch}`);
    return;
  }

  // Get changed files (paginated)
  const changedPaths = await getChangedFiles(github, owner, repo, pullNumber);
  console.log("Changed files:", changedPaths);

  // Match and dispatch
  const matched = matchDeployTargets(changedPaths, config.deployTargets);

  // FF merge only: post-merge branch HEAD == pr.head.sha (no new commit created).
  const mergedSha = pr.head.sha;
  console.log(`Post-merge SHA for ${targetBranch}: ${mergedSha}`);

  for (const target of matched) {
    console.log(`Triggering ${target.name} deploy...`);
    await github.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: target.workflow,
      ref: targetBranch,
      inputs: { sha: mergedSha },
    });
  }

  const summary = config.deployTargets
    .map((t) => `${t.name}: ${matched.includes(t)}`)
    .join(", ");
  console.log(summary);
}

module.exports = {
  triggerDeploys,
  getChangedFiles,
  matchDeployTargets,
  loadConfig,
};
