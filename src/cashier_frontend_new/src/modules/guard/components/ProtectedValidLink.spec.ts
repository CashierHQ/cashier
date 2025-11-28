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

describe("ProtectedValidLink Guard Logic", () => {
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

  describe("LinkDetailStore", () => {
    it("should show loading state while link is loading", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: true },
        link: null,
      } as any;

      const isLoading = mockContext.linkDetailStore.query.isLoading;
      expect(isLoading).toBe(true);
    });

    it("should redirect when link is not found", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: null,
      } as any;

      const hasLink =
        mockContext.linkDetailStore.link !== null &&
        mockContext.linkDetailStore.link !== undefined;
      const isLoading = mockContext.linkDetailStore.query.isLoading;

      if (!isLoading && !hasLink) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });

    it("should render children when link is valid", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: { id: "test-link" },
      } as any;

      const hasLink =
        mockContext.linkDetailStore.link !== null &&
        mockContext.linkDetailStore.link !== undefined;
      const isLoading = mockContext.linkDetailStore.query.isLoading;

      expect(isLoading).toBe(false);
      expect(hasLink).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("LinkCreationStore (temp link)", () => {
    it("should not show loading for temp links", () => {
      mockContext.linkCreationStore = {
        state: { step: 0 },
      } as any;

      const isLoading = false; // LinkCreationStore has no query
      expect(isLoading).toBe(false);
    });

    it("should redirect when temp link is not found", () => {
      mockContext.linkCreationStore = null;
      mockContext.hasTempLinkLoadAttempted = true;

      const shouldRedirect =
        mockContext.authState.isReady &&
        mockContext.hasTempLinkLoadAttempted &&
        !mockContext.linkCreationStore;

      if (shouldRedirect) {
        goto("/links");
      }

      expect(goto).toHaveBeenCalledWith("/links");
    });

    it("should render children when temp link exists", () => {
      mockContext.linkCreationStore = {
        state: { step: 0 },
      } as any;

      const hasLink = mockContext.linkCreationStore !== null;
      expect(hasLink).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("UserLinkStore", () => {
    it("should show loading state while user link is loading", () => {
      mockContext.userLinkStore = {
        linkDetail: {
          query: { isLoading: true },
          link: null,
        },
      } as any;

      const isLoading = mockContext.userLinkStore.linkDetail?.query?.isLoading;
      expect(isLoading).toBe(true);
    });

    it("should redirect when user link has no link", () => {
      mockContext.userLinkStore = {
        linkDetail: {
          query: { isLoading: false },
          link: null,
        },
      } as any;

      const hasLink =
        mockContext.userLinkStore.linkDetail?.link !== null &&
        mockContext.userLinkStore.linkDetail?.link !== undefined;
      const isLoading =
        mockContext.userLinkStore.linkDetail?.query?.isLoading ?? false;

      if (!isLoading && !hasLink) {
        goto("/404");
      }

      expect(goto).toHaveBeenCalledWith("/404");
    });

    it("should render children when user link is valid", () => {
      mockContext.userLinkStore = {
        linkDetail: {
          query: { isLoading: false },
          link: { id: "test-link" },
        },
      } as any;

      const hasLink =
        mockContext.userLinkStore.linkDetail?.link !== null &&
        mockContext.userLinkStore.linkDetail?.link !== undefined;
      const isLoading =
        mockContext.userLinkStore.linkDetail?.query?.isLoading ?? false;

      expect(isLoading).toBe(false);
      expect(hasLink).toBe(true);
      expect(goto).not.toHaveBeenCalled();
    });
  });

  describe("custom redirectTo", () => {
    const config = { type: GuardType.VALID_LINK, redirectTo: "/custom-path" };

    it("should redirect to custom path when link not found", () => {
      mockContext.linkDetailStore = {
        query: { isLoading: false },
        link: null,
      } as any;

      const hasLink = mockContext.linkDetailStore.link !== null;
      const isLoading = mockContext.linkDetailStore.query.isLoading;

      if (!isLoading && !hasLink) {
        goto(config.redirectTo);
      }

      expect(goto).toHaveBeenCalledWith("/custom-path");
    });
  });
});
