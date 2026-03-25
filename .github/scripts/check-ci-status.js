/**
 * Filter check runs to only those associated with the given PR,
 * excluding the workflow's own check.
 */
function filterPrChecks(checkRuns, prNumber, selfName = "fast-forward") {
  return checkRuns.filter((c) => {
    if (c.name === selfName) return false;
    return (
      c.pull_requests && c.pull_requests.some((p) => p.number === prNumber)
    );
  });
}

/**
 * Categorize checks into passed, failed, and pending arrays.
 * Skipped checks count as passed (not failed).
 */
function categorizeChecks(checks) {
  const passed = [];
  const failed = [];
  const pending = [];

  for (const c of checks) {
    if (c.status !== "completed") {
      pending.push(c);
    } else if (c.conclusion === "success" || c.conclusion === "skipped") {
      passed.push(c);
    } else {
      failed.push(c);
    }
  }

  return { passed, failed, pending };
}

/**
 * Post a failure comment on the PR and call core.setFailed.
 */
async function failWithComment({ github, context, core, message, reason }) {
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: message,
  });
  core.setFailed(reason);
}

/**
 * Main entry point: check PR draft status, merge conflicts, and CI checks.
 * Called from GitHub Actions via actions/github-script.
 */
async function checkCiStatus({ github, context, core }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prNumber = context.issue.number;

  // Get PR data
  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Reject draft PRs
  if (pr.draft) {
    await failWithComment({
      github,
      context,
      core,
      message:
        "**Cannot fast-forward**\n\nThis PR is still in draft. Please mark it as ready for review first.",
      reason: "Cannot merge draft PR",
    });
    return;
  }

  // Check for merge conflicts
  if (pr.mergeable === false) {
    await failWithComment({
      github,
      context,
      core,
      message:
        "**Cannot fast-forward**\n\nThis PR has merge conflicts. Please resolve them first.",
      reason: "PR has merge conflicts",
    });
    return;
  }

  // mergeable can be null if GitHub is still computing — warn but continue
  if (pr.mergeable === null) {
    console.log(
      "Warning: Mergeable status not yet computed by GitHub, proceeding anyway"
    );
  }

  // List checks for PR head SHA
  const { data: checks } = await github.rest.checks.listForRef({
    owner,
    repo,
    ref: pr.head.sha,
  });

  // Filter to PR-associated checks, excluding self
  const prChecks = filterPrChecks(checks.check_runs, prNumber);

  console.log(`Found ${prChecks.length} checks for PR #${prNumber}`);
  prChecks.forEach((c) =>
    console.log(`  - ${c.name}: ${c.status} / ${c.conclusion}`)
  );

  const { failed, pending } = categorizeChecks(prChecks);

  // Fail if checks still pending
  if (pending.length > 0) {
    await failWithComment({
      github,
      context,
      core,
      message: `**Cannot fast-forward**\n\nCI checks still running:\n${pending.map((c) => `- ${c.name}`).join("\n")}`,
      reason: `CI checks still running: ${pending.map((c) => c.name).join(", ")}`,
    });
    return;
  }

  // Fail if checks failed
  if (failed.length > 0) {
    await failWithComment({
      github,
      context,
      core,
      message: `**Cannot fast-forward**\n\nCI checks failed:\n${failed.map((c) => `- ${c.name}: ${c.conclusion}`).join("\n")}`,
      reason: `CI checks failed: ${failed.map((c) => c.name).join(", ")}`,
    });
    return;
  }

  console.log("All CI checks passed!");
}

module.exports = {
  checkCiStatus,
  filterPrChecks,
  categorizeChecks,
};
