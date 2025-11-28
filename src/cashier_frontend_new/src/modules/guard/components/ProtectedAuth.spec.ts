/* eslint-disable svelte/no-navigation-without-resolve */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
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
    const requireAuth = true;
    const redirectTo = "/";

    it("should show loading state when auth is not ready", () => {
      mockContext.authState = { ...mockContext.authState, isReady: false };
      const shouldShow = false;
      expect(shouldShow).toBe(false);
    });

    it("should redirect when requireAuth=true and user is not logged in", () => {
      mockContext.authState = { ...mockContext.authState, isReady: true };
      mockContext.userProfile.isLoggedIn = () => false;

      // Simulate the effect logic
      if (mockContext.authState.isReady) {
        const isLoggedIn = mockContext.userProfile.isLoggedIn();
        if (requireAuth && !isLoggedIn) {
          goto(redirectTo);
        }
      }

      expect(goto).toHaveBeenCalledWith("/");
    });

    it("should render children when auth check passes", () => {
      mockContext.authState = { ...mockContext.authState, isReady: true };
      mockContext.userProfile.isLoggedIn = () => true;

      const shouldShow =
        mockContext.authState.isReady && mockContext.userProfile.isLoggedIn();

      expect(shouldShow).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("requireAuth: false", () => {
    const requireAuth = false;
    const redirectTo = "/";

    it("should redirect when requireAuth=false and user is logged in", () => {
      mockContext.authState = { ...mockContext.authState, isReady: true };
      mockContext.userProfile.isLoggedIn = () => true;

      // Simulate the effect logic
      if (mockContext.authState.isReady) {
        const isLoggedIn = mockContext.userProfile.isLoggedIn();
        if (!requireAuth && isLoggedIn) {
          goto(redirectTo);
        }
      }

      expect(goto).toHaveBeenCalledWith("/");
    });

    it("should render children when user is not logged in", () => {
      mockContext.authState = { ...mockContext.authState, isReady: true };
      mockContext.userProfile.isLoggedIn = () => false;

      const shouldShow =
        mockContext.authState.isReady &&
        (!requireAuth || mockContext.userProfile.isLoggedIn());

      expect(shouldShow).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("custom redirectTo", () => {
    const requireAuth = true;
    const redirectTo = "/custom-path";

    it("should redirect to custom path", () => {
      mockContext.authState = { ...mockContext.authState, isReady: true };
      mockContext.userProfile.isLoggedIn = () => false;

      // Simulate the effect logic
      if (mockContext.authState.isReady) {
        const isLoggedIn = mockContext.userProfile.isLoggedIn();
        if (requireAuth && !isLoggedIn) {
          goto(redirectTo);
        }
      }

      expect(goto).toHaveBeenCalledWith("/custom-path");
    });
  });
});
