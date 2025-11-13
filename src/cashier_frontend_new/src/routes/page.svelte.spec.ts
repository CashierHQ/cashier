import { page } from "@vitest/browser/context";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Page from "./+page.svelte";

describe("/+page.svelte", () => {
  it("should render home page content for unauthenticated users", async () => {
    render(Page);

    // Wait a bit for auth state to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if the page shows home content (not redirected)
    // This test assumes user is not logged in
    const heading = page.getByRole("heading", { level: 1 });
    await expect.element(heading).toBeInTheDocument();
  });
});
