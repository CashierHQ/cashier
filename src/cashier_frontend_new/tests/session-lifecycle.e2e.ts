import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const fixtureUrl = (hardMs: number, idleMs: number) =>
  `/__e2e/session-lifecycle?hardMs=${hardMs}&idleMs=${idleMs}`;

const waitForSessionFixture = async (page: Page): Promise<void> => {
  await expect(page.getByTestId("fixture-ready")).toHaveText("ready");
};

const openSessionTab = async (
  context: BrowserContext,
  url: string,
): Promise<Page> => {
  const page = await context.newPage();
  await page.goto(url);
  await waitForSessionFixture(page);
  return page;
};

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  const page = await context.newPage();
  await page.goto(fixtureUrl(5_000, 5_000));
  await page.evaluate(() => localStorage.clear());
  await page.close();
});

test("shares the original hard expiry and logs out every tab", async ({
  page,
  context,
}) => {
  const url = fixtureUrl(2_500, 10_000);
  await page.goto(url);
  await waitForSessionFixture(page);
  const secondTab = await openSessionTab(context, url);
  await page.getByTestId("login").click();
  const originalSessionId = await page.getByTestId("session-id").innerText();
  const originalHardExpiry = await page.getByTestId("hard-expiry").innerText();

  await expect(secondTab.getByTestId("session-id")).toHaveText(
    originalSessionId,
  );
  await expect(secondTab.getByTestId("hard-expiry")).toHaveText(
    originalHardExpiry,
  );

  await expect(page.getByTestId("status")).toHaveText("logged-out", {
    timeout: 5_000,
  });
  await expect(secondTab.getByTestId("status")).toHaveText("logged-out");
  await expect(page.getByTestId("logout-reason")).toHaveText("hard-expiry");

  const afterExpiryTab = await openSessionTab(context, url);
  await expect(afterExpiryTab.getByTestId("status")).toHaveText("logged-out");
});

test("activity in one tab refreshes inactivity in every tab", async ({
  page,
  context,
}) => {
  const url = fixtureUrl(10_000, 2_000);
  await page.goto(url);
  await waitForSessionFixture(page);
  const secondTab = await openSessionTab(context, url);
  await page.getByTestId("login").click();
  await expect(secondTab.getByTestId("status")).toHaveText("authenticated");

  await page.waitForTimeout(1_000);
  await page.getByTestId("activity").hover();
  await page.waitForTimeout(1_200);

  await expect(page.getByTestId("status")).toHaveText("authenticated");
  await expect(secondTab.getByTestId("status")).toHaveText("authenticated");
  await expect(secondTab.getByTestId("idle-expiry")).toHaveText(
    await page.getByTestId("idle-expiry").innerText(),
  );

  await expect(page.getByTestId("status")).toHaveText("logged-out", {
    timeout: 3_000,
  });
  await expect(secondTab.getByTestId("status")).toHaveText("logged-out");
  await expect(page.getByTestId("logout-reason")).toHaveText("idle-expiry");
});

test("renewal replaces deadlines in every tab and removes old timers", async ({
  page,
  context,
}) => {
  const url = fixtureUrl(2_500, 10_000);
  await page.goto(url);
  await waitForSessionFixture(page);
  const secondTab = await openSessionTab(context, url);
  await page.getByTestId("login").click();
  const originalSessionId = await page.getByTestId("session-id").innerText();

  await page.waitForTimeout(1_300);
  await page.getByTestId("renew").click();
  const renewedSessionId = await page.getByTestId("session-id").innerText();
  expect(renewedSessionId).not.toBe(originalSessionId);
  await expect(secondTab.getByTestId("session-id")).toHaveText(
    renewedSessionId,
  );

  await page.waitForTimeout(1_500);
  await expect(page.getByTestId("status")).toHaveText("authenticated");
  await expect(secondTab.getByTestId("status")).toHaveText("authenticated");

  await page.getByTestId("logout").click();
  await expect(page.getByTestId("status")).toHaveText("logged-out");
  await expect(secondTab.getByTestId("status")).toHaveText("logged-out");
});

test("ignores duplicate and stale synchronization messages", async ({
  page,
  context,
}) => {
  const url = fixtureUrl(5_000, 5_000);
  await page.goto(url);
  await waitForSessionFixture(page);
  const secondTab = await openSessionTab(context, url);
  await page.getByTestId("login").click();
  const sessionId = await secondTab.getByTestId("session-id").innerText();
  const loginCount = await secondTab.getByTestId("login-count").innerText();

  await page.getByTestId("duplicate-login").click();
  await page.getByTestId("stale-login").click();
  await page.getByTestId("stale-logout").click();
  await page.waitForTimeout(200);

  await expect(secondTab.getByTestId("status")).toHaveText("authenticated");
  await expect(secondTab.getByTestId("session-id")).toHaveText(sessionId);
  await expect(secondTab.getByTestId("login-count")).toHaveText(loginCount);
  await expect(secondTab.getByTestId("logout-count")).toHaveText("0");
});
