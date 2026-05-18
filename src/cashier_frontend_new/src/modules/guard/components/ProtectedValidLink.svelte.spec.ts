// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import type { GuardContext } from "$modules/guard/context.svelte";
import ProtectedValidLinkTestHost from "$modules/guard/components/ProtectedValidLinkTestHost.svelte";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

let mockContext: GuardContext;

vi.mock("$modules/guard/context.svelte", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("$modules/guard/context.svelte")>();
  return {
    ...original,
    getGuardContext: () => mockContext,
  };
});

describe("ProtectedValidLink", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("$modules/guard/context.svelte");
    mockContext = new mod.GuardContext() as any;
    mockContext.authState = { isReady: false } as any;
  });

  it("renders loading when isLoading=true and no link exists", () => {
    mockContext.hasTempLinkLoadAttempted = false;

    render(ProtectedValidLinkTestHost);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("redirects to /404 when ready to check and no link", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: null,
    } as any;

    render(ProtectedValidLinkTestHost);

    await tick();

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("redirects when auth is ready, temp link load attempted, and linkStore is null", async () => {
    mockContext.authState = { isReady: true } as any;
    mockContext.hasTempLinkLoadAttempted = true;
    mockContext.linkDetailStore = null;
    mockContext.linkDetailStoreV3 = null;
    mockContext.userLinkStore = null;
    mockContext.userLinkStoreV3 = null;
    mockContext.linkCreationStore = null;
    mockContext.linkCreationStoreV3 = null;

    render(ProtectedValidLinkTestHost);

    await tick();

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("keeps rendering children during background loading after a valid link was rendered", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: { id: "1" },
    } as any;

    render(ProtectedValidLinkTestHost);

    await tick();
    expect(screen.getByTestId("child")).toBeInTheDocument();

    mockContext.linkDetailStore = {
      query: { isLoading: true },
      link: { id: "1" },
    } as any;

    await tick();

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("redirects to custom redirectTo when shouldRedirect is true", async () => {
    mockContext.linkDetailStore = {
      query: { isLoading: false },
      link: null,
    } as any;

    render(ProtectedValidLinkTestHost, {
      props: { redirectTo: "/custom-path" },
    });

    await tick();

    expect(goto).toHaveBeenCalledWith("/custom-path");
  });
});
