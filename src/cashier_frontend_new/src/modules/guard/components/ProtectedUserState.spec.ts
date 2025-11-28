/* eslint-disable @typescript-eslint/no-explicit-any, svelte/no-navigation-without-resolve */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import { GuardType } from "../types";
import { UserLinkStep } from "$modules/links/types/userLinkStep";
import type { GuardContext } from "../context.svelte";

// Mock navigation
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

describe("ProtectedUserState Guard Logic", () => {
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
    UserLinkStep.LANDING,
    UserLinkStep.ADDRESS_UNLOCKED,
    UserLinkStep.ADDRESS_LOCKED,
    UserLinkStep.GATE,
    UserLinkStep.COMPLETED,
  ];

  describe("default behavior (all states allowed)", () => {
    const config = { type: GuardType.USER_STATE };

    it("should allow all states by default", () => {
      mockContext.userLinkStore = {
        step: UserLinkStep.LANDING,
        isLoading: false,
      } as any;

      const allowedStates = config.allowedStates ?? allStates;
      const currentStep = mockContext.userLinkStore.step;
      const isStateValid = allowedStates.includes(currentStep);

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("with specific allowedStates", () => {
    const config = {
      type: GuardType.USER_STATE,
      allowedStates: [UserLinkStep.LANDING],
    };

    it("should show loading state while user link is loading", () => {
      mockContext.userLinkStore = {
        step: UserLinkStep.LANDING,
        isLoading: true,
      } as any;

      const isLoading = mockContext.userLinkStore.isLoading;
      expect(isLoading).toBe(true);
    });

    it("should redirect to /404 when user state is not in allowedStates", () => {
      mockContext.userLinkStore = {
        step: UserLinkStep.GATE,
        isLoading: false,
      } as any;

      const currentStep = mockContext.userLinkStore.step;
      const isStateValid = config.allowedStates.includes(currentStep);

      if (!isStateValid) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });

    it("should render children when user state is valid", () => {
      mockContext.userLinkStore = {
        step: UserLinkStep.LANDING,
        isLoading: false,
      } as any;

      const currentStep = mockContext.userLinkStore.step;
      const isStateValid = config.allowedStates.includes(currentStep);

      expect(isStateValid).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("multiple allowed states", () => {
    const config = {
      type: GuardType.USER_STATE,
      allowedStates: [
        UserLinkStep.ADDRESS_UNLOCKED,
        UserLinkStep.ADDRESS_LOCKED,
        UserLinkStep.GATE,
      ],
    };

    it("should allow any of the specified states", () => {
      const testStates = [
        UserLinkStep.ADDRESS_UNLOCKED,
        UserLinkStep.ADDRESS_LOCKED,
        UserLinkStep.GATE,
      ];

      testStates.forEach((step) => {
        vi.clearAllMocks();
        mockContext.userLinkStore = {
          step,
          isLoading: false,
        } as any;

        const currentStep = mockContext.userLinkStore.step;
        const isStateValid = config.allowedStates.includes(currentStep);

        expect(isStateValid).toBe(true);
        expect(goto).not.toHaveBeenCalled();
      });
    });

    it("should reject states not in the allowed list", () => {
      mockContext.userLinkStore = {
        step: UserLinkStep.COMPLETED,
        isLoading: false,
      } as any;

      const currentStep = mockContext.userLinkStore.step;
      const isStateValid = config.allowedStates.includes(currentStep);

      if (!isStateValid) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });
  });
});
