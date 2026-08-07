import { expect, test, type Page } from "@playwright/test";

type Scenario = "success" | "cancel" | "blocked" | "timeout";

const openScenario = async (page: Page, scenario: Scenario) => {
  await page.goto(`/__e2e/auth-popup?scenario=${scenario}`);
  await expect(page.getByTestId("fixture-ready")).toHaveText("ready", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("dialog", { name: "Connect your wallet" }),
  ).toBeVisible({ timeout: 15_000 });
};

const beginGoogleAuthentication = async (page: Page) => {
  const popupPromise = page.waitForEvent("popup");
  await page.getByTestId("login-google-button").click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  return popup;
};

test.describe("authentication popup lifecycle", () => {
  test("completes authentication through one popup and preserves the route", async ({
    page,
  }) => {
    await openScenario(page, "success");
    const originatingRoute = page.url();
    const popup = await beginGoogleAuthentication(page);

    await expect(page.getByTestId("attempts")).toHaveText("1");
    await expect(
      page.getByRole("button", { name: "Sign in with Apple" }),
    ).toBeDisabled();

    await popup
      .getByRole("button", { name: "Complete authentication" })
      .click();

    await expect(
      page.getByRole("dialog", { name: "Connect your wallet" }),
    ).toBeHidden();
    await expect(page.getByText("Successfully logged in")).toBeVisible();
    await expect(page.getByTestId("success-signals")).toHaveText("1");
    await expect.poll(() => popup.isClosed()).toBe(true);
    expect(page.url()).toBe(originatingRoute);
  });

  test("restores focus and the modal after manual popup closure", async ({
    page,
  }) => {
    await openScenario(page, "cancel");
    const originatingRoute = page.url();
    const popup = await beginGoogleAuthentication(page);

    await popup.close();

    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).toBeEnabled();
    await expect(page.getByTestId("focus-restorations")).toHaveText("1");
    await expect(page.getByText("Failed to connect wallet.")).toHaveCount(0);
    expect(page.url()).toBe(originatingRoute);
  });

  test("handles a blocked popup as an error without changing route", async ({
    page,
    context,
  }) => {
    await openScenario(page, "blocked");
    const originatingRoute = page.url();
    const pageCount = context.pages().length;

    await page.getByRole("button", { name: "Sign in with Google" }).click();

    await expect(page.getByText("Failed to connect wallet.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("attempts")).toHaveText("1");
    expect(context.pages()).toHaveLength(pageCount);
    expect(page.url()).toBe(originatingRoute);
  });

  test("handles an authentication timeout without changing route", async ({
    page,
  }) => {
    await openScenario(page, "timeout");
    const originatingRoute = page.url();
    const popup = await beginGoogleAuthentication(page);

    await expect(page.getByText("Failed to connect wallet.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).toBeEnabled();
    expect(page.url()).toBe(originatingRoute);

    await popup.close();
  });

  test("does not create duplicate attempts or authentication tabs", async ({
    page,
    context,
  }) => {
    await openScenario(page, "cancel");
    const originatingRoute = page.url();
    const pageCount = context.pages().length;
    const popup = await beginGoogleAuthentication(page);

    const googleButton = page.getByTestId("login-google-button");
    await expect(googleButton).toBeDisabled();
    await googleButton.evaluate((button) =>
      button.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    await page
      .getByRole("button", { name: "Sign in with Apple" })
      .evaluate((button) =>
        button.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );

    await expect(page.getByTestId("attempts")).toHaveText("1");
    expect(context.pages()).toHaveLength(pageCount + 1);
    expect(page.url()).toBe(originatingRoute);

    await popup.close();
  });
});
