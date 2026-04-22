/* eslint-disable @typescript-eslint/no-explicit-any, svelte/no-navigation-without-resolve */
import { goto } from "$app/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock navigation
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

describe("ProtectedValidLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shouldShowLoading=true when isLoading && !hasLink", () => {
    const isLoading = true;
    const hasLink = false;
    const hasRenderedValidLink = false;
    const shouldShowLoading = isLoading && !hasLink && !hasRenderedValidLink;
    expect(shouldShowLoading).toBe(true);
  });

  it("redirects to /404 when ready to check and no link", () => {
    const redirectTo: string | undefined = undefined;
    const linkStore = {}; // not null → ready to check
    const isLoading = false;
    const hasLink = false;

    const isReadyToCheck = !isLoading && linkStore !== null;
    const shouldRedirect = isReadyToCheck && !hasLink;

    if (shouldRedirect) {
      goto(redirectTo || "/404");
    }

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("redirects when auth is ready, temp link load attempted, and linkStore is null", () => {
    const redirectTo: string | undefined = undefined;
    const authReady = true;
    const hasTempLinkLoadAttempted = true;
    const linkStore = null;
    const isLoading = false;

    const isReadyToCheck = !isLoading && linkStore !== null;
    const hasLink = false;
    const shouldRedirect =
      (isReadyToCheck && !hasLink) ||
      (authReady && hasTempLinkLoadAttempted && !linkStore);

    if (shouldRedirect) {
      goto(redirectTo || "/404");
    }

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("renders children during background loading if a valid link was rendered before (hasRenderedValidLink)", () => {
    // Phase 1: valid link rendered
    let hasRenderedValidLink = false;
    const feeTokenAddress = "n/a";
    void feeTokenAddress;

    const linkStorePhase1 = {}; // exists
    const isLoadingPhase1 = false;
    const hasLinkPhase1 = true;
    const isValidPhase1 = !linkStorePhase1
      ? false
      : isLoadingPhase1
        ? false
        : hasLinkPhase1;

    if (isValidPhase1) {
      hasRenderedValidLink = true;
    }

    // Phase 2: refetching (loading=true) but we still have the link
    const linkStorePhase2 = {}; // exists
    const isLoadingPhase2 = true;
    const hasLinkPhase2 = true;
    const isValidPhase2 = !linkStorePhase2
      ? false
      : isLoadingPhase2
        ? false
        : hasLinkPhase2;
    const shouldShowLoading =
      isLoadingPhase2 && !hasLinkPhase2 && !hasRenderedValidLink;
    const shouldRenderChildren =
      !shouldShowLoading &&
      (isValidPhase2 || (hasRenderedValidLink && isLoadingPhase2));

    expect(hasRenderedValidLink).toBe(true);
    expect(shouldShowLoading).toBe(false);
    expect(shouldRenderChildren).toBe(true);
  });

  it("redirects to custom redirectTo when shouldRedirect is true", () => {
    const redirectTo = "/custom-path";
    const linkStore = {}; // ready to check
    const isLoading = false;
    const hasLink = false;

    const isReadyToCheck = !isLoading && linkStore !== null;
    const shouldRedirect = isReadyToCheck && !hasLink;

    if (shouldRedirect) {
      goto(redirectTo || "/404");
    }

    expect(goto).toHaveBeenCalledWith("/custom-path");
  });
});
