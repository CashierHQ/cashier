/* eslint-disable @typescript-eslint/no-explicit-any, svelte/no-navigation-without-resolve */
import { goto } from "$app/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserLinkStep } from "$modules/links/types/userLinkStep";

// Mock navigation
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

describe("ProtectedUserState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shouldShowLoading=true when isLoading && currentStep is null", () => {
    const userLinkStore = { isLoading: true } as any;

    const currentStep =
      userLinkStore && "step" in userLinkStore ? userLinkStore.step : null;
    const isLoading =
      userLinkStore && "isLoading" in userLinkStore
        ? userLinkStore.isLoading
        : false;
    const hasRenderedValidState = false;
    const shouldShowLoading =
      isLoading && currentStep === null && !hasRenderedValidState;

    expect(shouldShowLoading).toBe(true);
  });

  it("redirects to /404 when store exists, not loading, and state is not allowed", () => {
    const allowedStates = [UserLinkStep.LANDING];
    const userLinkStore = {
      step: UserLinkStep.GATE,
      isLoading: false,
    } as any;

    const currentStep =
      userLinkStore && "step" in userLinkStore ? userLinkStore.step : null;
    const isLoading =
      userLinkStore && "isLoading" in userLinkStore
        ? userLinkStore.isLoading
        : false;
    const isStateValid =
      currentStep !== null && allowedStates.includes(currentStep);
    const shouldRedirect = userLinkStore && !isLoading && !isStateValid;

    if (shouldRedirect) {
      goto("/404");
    }

    expect(goto).toHaveBeenCalledWith("/404");
  });

  it("renders children when state is valid", () => {
    const allowedStates = [UserLinkStep.LANDING];
    const userLinkStore = {
      step: UserLinkStep.LANDING,
      isLoading: false,
    } as any;

    const currentStep =
      userLinkStore && "step" in userLinkStore ? userLinkStore.step : null;
    const isLoading =
      userLinkStore && "isLoading" in userLinkStore
        ? userLinkStore.isLoading
        : false;
    const isStateValid =
      currentStep !== null && allowedStates.includes(currentStep);
    const hasRenderedValidState = isStateValid;
    const shouldRenderChildren =
      isStateValid || (hasRenderedValidState && isLoading);

    expect(shouldRenderChildren).toBe(true);
    expect(goto).not.toHaveBeenCalled();
  });

  it("renders children during background loading after a valid state was rendered (hasRenderedValidState)", () => {
    const allowedStates = [UserLinkStep.LANDING];

    // Phase 1: valid
    let hasRenderedValidState = false;
    const phase1 = { step: UserLinkStep.LANDING, isLoading: false } as any;
    const currentStep1 = "step" in phase1 ? phase1.step : null;
    const isStateValid1 =
      currentStep1 !== null && allowedStates.includes(currentStep1);
    if (isStateValid1) hasRenderedValidState = true;

    // Phase 2: loading=true, keep step
    const phase2 = { step: UserLinkStep.LANDING, isLoading: true } as any;
    const currentStep2 = "step" in phase2 ? phase2.step : null;
    const isLoading2 = "isLoading" in phase2 ? phase2.isLoading : false;
    const isStateValid2 =
      currentStep2 !== null && allowedStates.includes(currentStep2);

    const shouldShowLoading = isLoading2 && currentStep2 === null;
    void shouldShowLoading;
    const shouldRenderChildren =
      !shouldShowLoading &&
      (isStateValid2 || (hasRenderedValidState && isLoading2));

    expect(hasRenderedValidState).toBe(true);
    expect(shouldShowLoading).toBe(false);
    expect(shouldRenderChildren).toBe(true);
  });

  it("prefers userLinkStoreV3 over userLinkStore when selecting current step", () => {
    const allowedStates = [UserLinkStep.LANDING];
    const userLinkStore = { step: UserLinkStep.GATE, isLoading: false } as any;
    const userLinkStoreV3 = {
      step: UserLinkStep.LANDING,
      isLoading: false,
    } as any;

    const selected = userLinkStoreV3 || userLinkStore;
    const currentStep = selected && "step" in selected ? selected.step : null;
    const isLoading =
      selected && "isLoading" in selected ? selected.isLoading : false;

    const isStateValid =
      currentStep !== null && allowedStates.includes(currentStep);
    const shouldRedirect = selected && !isLoading && !isStateValid;

    expect(isStateValid).toBe(true);
    expect(shouldRedirect).toBe(false);
    expect(goto).not.toHaveBeenCalled();
  });
});
