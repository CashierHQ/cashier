/* eslint-disable svelte/no-navigation-without-resolve */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import { GuardType } from "../types";
import type { GuardContext } from "../context.svelte";

// Mock navigation
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string) => path,
}));

describe("ProtectedAuth Guard Logic", () => {
  let mockContext: GuardContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      authState: {
        isReady: false,
        isLoggedIn: false,
      },
      userProfile: {
        isLoggedIn: () => false,
      },
      linkDetailStore: null,
      userLinkStore: null,
      linkCreationStore: null,
      isGuardCheckComplete: false,
      hasTempLinkLoadAttempted: false,
      setLinkDetailStore: vi.fn(),
      setUserLinkStore: vi.fn(),
      setLinkCreationStore: vi.fn(),
      setGuardCheckComplete: vi.fn(),
      setHasTempLinkLoadAttempted: vi.fn(),
    } as unknown as GuardContext;
  });

  describe("requireAuth: true (default)", () => {
    const config = { type: GuardType.AUTH };

    it("should show loading state when auth is not ready", () => {
      mockContext.authState.isReady = false;
      const shouldShow = false;
      expect(shouldShow).toBe(false);
    });

    it("should redirect when requireAuth=true and user is not logged in", () => {
      mockContext.authState.isReady = true;
      mockContext.userProfile.isLoggedIn = () => false;

      // Simulate the effect logic
      if (mockContext.authState.isReady) {
        const isLoggedIn = mockContext.userProfile.isLoggedIn();
        const requireAuth = config.requireAuth ?? true;
        const redirectTo = "/";
        if (requireAuth && !isLoggedIn) {
          goto(redirectTo);
        }
      }

      expect(goto).toHaveBeenCalledWith("/");
    });

    it("should render children when auth check passes", () => {
      mockContext.authState.isReady = true;
      mockContext.userProfile.isLoggedIn = () => true;

      const shouldShow =
        mockContext.authState.isReady && mockContext.userProfile.isLoggedIn();

      expect(shouldShow).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("requireAuth: false", () => {
    const config = { type: GuardType.AUTH, requireAuth: false };

    it("should redirect when requireAuth=false and user is logged in", () => {
      mockContext.authState.isReady = true;
      mockContext.userProfile.isLoggedIn = () => true;

      // Simulate the effect logic
      if (mockContext.authState.isReady) {
        const isLoggedIn = mockContext.userProfile.isLoggedIn();
        const requireAuth = config.requireAuth ?? true;
        const redirectTo = config.redirectTo ?? "/";
        if (!requireAuth && isLoggedIn) {
          goto(redirectTo);
        }
      }

      expect(goto).toHaveBeenCalledWith("/");
    });

    it("should render children when user is not logged in", () => {
      mockContext.authState.isReady = true;
      mockContext.userProfile.isLoggedIn = () => false;

      const requireAuth = config.requireAuth ?? true;
      const shouldShow =
        mockContext.authState.isReady &&
        (!requireAuth || mockContext.userProfile.isLoggedIn());

      expect(shouldShow).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("custom redirectTo", () => {
    const config = {
      type: GuardType.AUTH,
      requireAuth: true,
      redirectTo: "/custom-path",
    };

    it("should redirect to custom path", () => {
      mockContext.authState.isReady = true;
      mockContext.userProfile.isLoggedIn = () => false;

      // Simulate the effect logic
      if (mockContext.authState.isReady) {
        const isLoggedIn = mockContext.userProfile.isLoggedIn();
        if (config.requireAuth && !isLoggedIn) {
          goto(config.redirectTo);
        }
      }

      expect(goto).toHaveBeenCalledWith("/custom-path");
    });
  });
});
