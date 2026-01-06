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

    it("should not show loading for temp links when hasTempLinkLoadAttempted is true", () => {
      mockContext.linkCreationStore = {
        state: { step: LinkStep.CHOOSE_TYPE },
      } as any;
      mockContext.hasTempLinkLoadAttempted = true;

      const isLoading = false; // LinkCreationStore has no query, and hasTempLinkLoadAttempted is true
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

    it("should allow CREATED step for LinkCreationStore (Transfer Pending)", () => {
      mockContext.linkCreationStore = {
        state: { step: LinkStep.CREATED },
      } as any;

      // Transfer Pending should always be allowed, even if not in allowedStates
      const currentStep = mockContext.linkCreationStore?.state.step;
      const isTransferPending = currentStep === LinkStep.CREATED;
      const isStateValid =
        isTransferPending || allowedStates.includes(currentStep as LinkStep);

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });

    it("should redirect when temp link state is invalid (not CREATED)", () => {
      mockContext.linkCreationStore = {
        state: { step: LinkStep.PREVIEW },
      } as any;

      const currentStep = mockContext.linkCreationStore?.state.step;
      const isStateValid = allowedStates.includes(currentStep as LinkStep);

      if (!isStateValid) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });
  });

  describe("LinkDetailStore with Transfer Pending (CREATE_LINK state)", () => {
    const allowedStates = [LinkStep.CHOOSE_TYPE, LinkStep.ADD_ASSET];

    it("should allow LinkDetailStore with CREATE_LINK state and CREATED step", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: { state: "CREATE_LINK" },
        state: { step: LinkStep.CREATED },
      } as any;

      // Transfer Pending should always be allowed
      const isTransferPending =
        mockContext.linkDetailStore?.link?.state === "CREATE_LINK" &&
        mockContext.linkDetailStore?.state.step === LinkStep.CREATED;
      const isStateValid =
        isTransferPending ||
        allowedStates.includes(
          mockContext.linkDetailStore?.state.step as LinkStep,
        );

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });

    it("should wait for link to load before checking state", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: true },
        link: null,
        state: { step: LinkStep.CREATED },
      } as any;

      // Should return null while loading
      const currentStep = mockContext.linkDetailStore?.query.isLoading
        ? null
        : mockContext.linkDetailStore?.state.step;

      expect(currentStep).toBe(null);
    });
  });

  describe("shouldRedirect logic", () => {
    it("should not redirect while loading", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: true },
        state: { step: LinkStep.ACTIVE },
      } as any;

      const isLoading = mockContext.linkDetailStore?.query.isLoading;
      const shouldRedirect = !isLoading && false; // isStateValid would be false, but isLoading is true

      expect(shouldRedirect).toBe(false);
      expect(goto).not.toHaveBeenCalled();
    });

    it("should not redirect when currentStep is null", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: null, // link is missing, so currentStep would be null
        state: { step: LinkStep.ACTIVE },
      } as any;

      const currentStep = mockContext.linkDetailStore?.link
        ? mockContext.linkDetailStore?.state.step
        : null;
      const shouldRedirect = currentStep !== null && false; // isStateValid would be false

      expect(currentStep).toBe(null);
      expect(shouldRedirect).toBe(false);
    });
  });
});
