import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const fixtureUrl = (hardMs: number, idleMs: number) =>
  `/__e2e/session-lifecycle?hardMs=${hardMs}&idleMs=${idleMs}`;

const openSessionTab = async (
  context: BrowserContext,
  url: string,
): Promise<Page> => {
  const page = await context.newPage();
  await page.goto(url);
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
  const url = fixtureUrl(1_200, 5_000);
  await page.goto(url);
  await page.getByTestId("login").click();
  const originalSessionId = await page.getByTestId("session-id").innerText();
  const originalHardExpiry = await page.getByTestId("hard-expiry").innerText();

  const secondTab = await openSessionTab(context, url);
  await expect(secondTab.getByTestId("session-id")).toHaveText(
    originalSessionId,
  );
  await expect(secondTab.getByTestId("hard-expiry")).toHaveText(
    originalHardExpiry,
  );

  await expect(page.getByTestId("status")).toHaveText("logged-out", {
    timeout: 3_000,
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
  const url = fixtureUrl(5_000, 900);
  await page.goto(url);
  await page.getByTestId("login").click();
  const secondTab = await openSessionTab(context, url);

  await page.waitForTimeout(600);
  await page.getByTestId("activity").hover();
  await page.waitForTimeout(450);

  await expect(page.getByTestId("status")).toHaveText("authenticated");
  await expect(secondTab.getByTestId("status")).toHaveText("authenticated");
  await expect(secondTab.getByTestId("idle-expiry")).toHaveText(
    await page.getByTestId("idle-expiry").innerText(),
  );

  await expect(page.getByTestId("status")).toHaveText("logged-out", {
    timeout: 2_000,
  });
  await expect(secondTab.getByTestId("status")).toHaveText("logged-out");
  await expect(page.getByTestId("logout-reason")).toHaveText("idle-expiry");
});

test("renewal replaces deadlines in every tab and removes old timers", async ({
  page,
  context,
}) => {
  const url = fixtureUrl(1_200, 5_000);
  await page.goto(url);
  await page.getByTestId("login").click();
  const originalSessionId = await page.getByTestId("session-id").innerText();
  const secondTab = await openSessionTab(context, url);

  await page.waitForTimeout(650);
  await page.getByTestId("renew").click();
  const renewedSessionId = await page.getByTestId("session-id").innerText();
  expect(renewedSessionId).not.toBe(originalSessionId);
  await expect(secondTab.getByTestId("session-id")).toHaveText(
    renewedSessionId,
  );

  await page.waitForTimeout(700);
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
  await page.getByTestId("login").click();
  const secondTab = await openSessionTab(context, url);
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
