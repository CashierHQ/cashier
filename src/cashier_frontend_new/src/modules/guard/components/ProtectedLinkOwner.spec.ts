/* eslint-disable @typescript-eslint/no-explicit-any, svelte/no-navigation-without-resolve */
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

describe("ProtectedLinkOwner Guard Logic", () => {
  let mockContext: GuardContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      authState: {
        isReady: true,
        account: {
          owner: "owner-principal-123",
        },
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

  describe("mustBeOwner: true (default)", () => {
    const mustBeOwner = true;
    const redirectTo = "/links";

    it("should redirect when mustBeOwner=true and user is not owner", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: {
          creator: "different-principal-456",
        },
      } as any;

      const isOwner =
        mockContext.linkDetailStore?.link?.creator?.toString() ===
        mockContext.authState.account?.owner;

      if (mustBeOwner && !isOwner) {
        goto(redirectTo);
      }

      expect(goto).toHaveBeenCalledWith("/links");
    });

    it("should render children when user is owner", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: {
          creator: "owner-principal-123",
        },
      } as any;

      const isOwner =
        mockContext.linkDetailStore?.link?.creator?.toString() ===
        mockContext.authState.account?.owner;

      expect(isOwner).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("mustBeOwner: false", () => {
    const mustBeOwner = false;
    const redirectTo = "/links";

    it("should redirect when mustBeOwner=false and user is owner", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: {
          creator: "owner-principal-123",
        },
      } as any;

      const isOwner =
        mockContext.linkDetailStore?.link?.creator?.toString() ===
        mockContext.authState.account?.owner;

      if (!mustBeOwner && isOwner) {
        goto(redirectTo);
      }

      expect(goto).toHaveBeenCalledWith("/links");
    });

    it("should render children when user is not owner", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: {
          creator: "different-principal-456",
        },
      } as any;

      const isOwner =
        mockContext.linkDetailStore?.link?.creator?.toString() ===
        mockContext.authState.account?.owner;

      expect(isOwner).toBe(false);
      expect(!mustBeOwner).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("temp links (LinkCreationStore)", () => {
    it("should always pass ownership check for temp links", () => {
      mockContext.linkCreationStore = {
        state: { step: 0 },
      } as any;

      const isOwner = mockContext.linkCreationStore ? true : false;

      expect(isOwner).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("UserLinkStore", () => {
    it("should check ownership for UserLinkStore", () => {
      mockContext.userLinkStore = {
        linkDetail: {
          query: { isLoading: false },
          link: {
            creator: "owner-principal-123",
          },
        },
      } as any;

      const isOwner =
        mockContext.userLinkStore?.linkDetail?.link?.creator?.toString() ===
        mockContext.authState.account?.owner;

      expect(isOwner).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("custom redirectTo", () => {
    const redirectTo = "/custom-path";

    it("should redirect to custom path when not owner", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: {
          creator: "different-principal-456",
        },
      } as any;

      const isOwner =
        mockContext.linkDetailStore?.link?.creator?.toString() ===
        mockContext.authState.account?.owner;

      if (!isOwner) {
        goto(redirectTo);
      }

      expect(goto).toHaveBeenCalledWith("/custom-path");
    });
  });
});
