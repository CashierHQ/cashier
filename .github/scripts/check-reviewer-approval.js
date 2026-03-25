/**
 * Get latest review state per user, skipping bots and COMMENTED.
 * Last review per user wins.
 */
function getLatestReviews(reviews) {
  const latestReviews = {};
  for (const review of reviews) {
    if (review.user.type === "Bot") continue;
    if (review.state === "COMMENTED") continue;
    latestReviews[review.user.login] = review.state;
  }
  return latestReviews;
}

/**
 * Compute approval status from pending reviewers and latest reviews.
 * Returns: { allAssigned, approvers, notApproved, pendingList, rejectedList }
 */
function computeApprovalStatus(pendingReviewers, latestReviews) {
  const reviewersWhoReviewed = Object.keys(latestReviews);
  const allAssigned = [
    ...new Set([...pendingReviewers, ...reviewersWhoReviewed]),
  ];

  const approvers = Object.entries(latestReviews)
    .filter(([, state]) => state === "APPROVED")
    .map(([user]) => user);

  const notApproved = allAssigned.filter((r) => !approvers.includes(r));
  const pendingList = pendingReviewers.filter((r) => notApproved.includes(r));
  const rejectedList = notApproved.filter((r) => !pendingReviewers.includes(r));

  return { allAssigned, approvers, notApproved, pendingList, rejectedList };
}

/**
 * Build failure comment body with sections for waiting/not-approved/approved.
 */
function buildFailureMessage(pendingList, rejectedList, approvers) {
  let message = "**Cannot fast-forward**\n\n";

  if (pendingList.length > 0) {
    message += `Waiting for review:\n${pendingList.map((r) => `- @${r}`).join("\n")}\n\n`;
  }

  if (rejectedList.length > 0) {
    message += `Has not approved:\n${rejectedList.map((r) => `- @${r}`).join("\n")}\n\n`;
  }

  if (approvers.length > 0) {
    message += `Already approved: ${approvers.join(", ")}`;
  }

  return message;
}

/**
 * Main entry point: check that all assigned reviewers have approved.
 * Called from GitHub Actions via actions/github-script.
 */
async function checkReviewerApproval({ github, context, core }) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const prNumber = context.issue.number;

  // Get PR data for pending reviewers
  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const pendingReviewers = pr.requested_reviewers.map((r) => r.login);

  // Get all reviews
  const { data: reviews } = await github.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });

  const latestReviews = getLatestReviews(reviews);
  const { allAssigned, approvers, notApproved, pendingList, rejectedList } =
    computeApprovalStatus(pendingReviewers, latestReviews);

  console.log("Pending reviewers:", pendingReviewers);
  console.log("Reviewers who reviewed:", Object.keys(latestReviews));
  console.log("All assigned:", allAssigned);
  console.log("Approvers:", approvers);
  console.log("Not approved:", notApproved);

  // Case 1: No reviewers at all
  if (allAssigned.length === 0) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: "**Cannot fast-forward**\n\nNo reviewers assigned. Please assign at least one reviewer.",
    });
    core.setFailed("No reviewers assigned");
    return;
  }

  // Case 2: Someone still pending or didn't approve
  if (notApproved.length > 0) {
    const message = buildFailureMessage(pendingList, rejectedList, approvers);
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: message,
    });
    core.setFailed("Not all reviewers approved");
    return;
  }

  console.log("All reviewers approved!");
}

module.exports = {
  checkReviewerApproval,
  getLatestReviews,
  computeApprovalStatus,
  buildFailureMessage,
};
