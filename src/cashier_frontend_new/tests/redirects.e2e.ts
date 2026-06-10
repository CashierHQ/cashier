import { expect, test } from "@playwright/test";

test.describe("route pages", () => {
  test("public landing renders", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("unknown app route renders not found", async ({ page }) => {
    await page.goto("/test");

    await expect(page).toHaveURL((url) => url.pathname === "/test");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
