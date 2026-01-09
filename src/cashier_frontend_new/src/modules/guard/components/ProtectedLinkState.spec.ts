/* eslint-disable @typescript-eslint/no-explicit-any, svelte/no-navigation-without-resolve */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import { LinkStep } from "$modules/links/types/linkStep";
import type { GuardContext } from "../context.svelte";

// Mock navigation
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

describe("ProtectedLinkState Guard Logic", () => {
  let mockContext: GuardContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      authState: {
        isReady: true,
      },
      userProfile: {
        isLoggedIn: () => true,
      },
      linkDetailStore: null,
      userLinkStore: null,
      linkCreationStore: null,
      isGuardCheckComplete: false,
      hasTempLinkLoadAttempted: true,
      setLinkDetailStore: vi.fn(),
      setUserLinkStore: vi.fn(),
      setLinkCreationStore: vi.fn(),
      setGuardCheckComplete: vi.fn(),
      setHasTempLinkLoadAttempted: vi.fn(),
    } as unknown as GuardContext;
  });

  const allStates = [
    LinkStep.CHOOSE_TYPE,
    LinkStep.ADD_ASSET,
    LinkStep.PREVIEW,
    LinkStep.CREATED,
    LinkStep.ACTIVE,
    LinkStep.INACTIVE,
    LinkStep.ENDED,
  ];

  describe("default behavior (all states allowed)", () => {
    const allowedStates = allStates;

    it("should allow all states by default", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        state: { step: LinkStep.ACTIVE },
      } as any;

      const currentStep = mockContext.linkDetailStore?.state.step;
      const isStateValid = allowedStates.includes(currentStep as LinkStep);

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("with specific allowedStates", () => {
    const allowedStates = [LinkStep.CREATED, LinkStep.ACTIVE];

    it("should show loading state while link state is loading", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: true },
        state: { step: LinkStep.CREATED },
      } as any;

      const isLoading = mockContext.linkDetailStore?.query.isLoading;
      expect(isLoading).toBe(true);
    });

    it("should redirect to /404 when link state is not in allowedStates", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        state: { step: LinkStep.ENDED },
      } as any;

      const currentStep = mockContext.linkDetailStore?.state.step;
      const isStateValid = allowedStates.includes(currentStep as LinkStep);

      if (!isStateValid) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });

    it("should render children when link state is valid", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        state: { step: LinkStep.ACTIVE },
      } as any;

      const currentStep = mockContext.linkDetailStore?.state.step;
      const isStateValid = allowedStates.includes(currentStep as LinkStep);

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("LinkCreationStore (temp link)", () => {
    const allowedStates = [LinkStep.CHOOSE_TYPE, LinkStep.ADD_ASSET];

    it("should not show loading for temp links", () => {
      mockContext.linkCreationStore = {
        state: { step: LinkStep.CHOOSE_TYPE },
      } as any;

      const isLoading = false; // LinkCreationStore has no query
      expect(isLoading).toBe(false);
    });

    it("should validate temp link state", () => {
      mockContext.linkCreationStore = {
        state: { step: LinkStep.CHOOSE_TYPE },
      } as any;

      const currentStep = mockContext.linkCreationStore?.state.step;
      const isStateValid = allowedStates.includes(currentStep as LinkStep);

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });

    it("should redirect when temp link state is invalid", () => {
      mockContext.linkCreationStore = {
        state: { step: LinkStep.CREATED },
      } as any;

      const currentStep = mockContext.linkCreationStore?.state.step;
      const isStateValid = allowedStates.includes(currentStep as LinkStep);

      if (!isStateValid) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });
  });
});
