import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuardContext } from "./context.svelte";
import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";

// Mock the auth and userProfile modules using vi.hoisted
const { mockAuthState, mockUserProfile } = vi.hoisted(() => ({
  mockAuthState: {
    isReady: false,
    isLoggedIn: false,
    account: null as { owner: string } | null,
  },
  mockUserProfile: {
    isLoggedIn: () => false,
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: mockAuthState,
}));

vi.mock("$modules/shared/services/userProfile.svelte", () => ({
  userProfile: mockUserProfile,
}));

describe("GuardContext", () => {
  let context: GuardContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock auth state
    mockAuthState.isReady = false;
    mockAuthState.isLoggedIn = false;
    mockAuthState.account = null;
    mockUserProfile.isLoggedIn = () => false;

    context = new GuardContext();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(context.linkDetailStore).toBeNull();
      expect(context.userLinkStore).toBeNull();
      expect(context.linkCreationStore).toBeNull();
      expect(context.isGuardCheckComplete).toBe(false);
      expect(context.hasTempLinkLoadAttempted).toBe(false);
    });

    it("should initialize with provided linkDetailStore", () => {
      const mockStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const ctx = new GuardContext({ linkDetailStore: mockStore });

      expect(ctx.linkDetailStore).toBe(mockStore);
      expect(ctx.userLinkStore).toBeNull();
      expect(ctx.linkCreationStore).toBeNull();
    });

    it("should initialize with provided userLinkStore", () => {
      const mockStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      const ctx = new GuardContext({ userLinkStore: mockStore });

      expect(ctx.userLinkStore).toBe(mockStore);
      expect(ctx.linkDetailStore).toBeNull();
      expect(ctx.linkCreationStore).toBeNull();
    });

    it("should initialize with provided linkCreationStore", () => {
      const mockStore = { link: null } as unknown as LinkCreationStore;
      const ctx = new GuardContext({ linkCreationStore: mockStore });

      expect(ctx.linkCreationStore).toBe(mockStore);
      expect(ctx.linkDetailStore).toBeNull();
      expect(ctx.userLinkStore).toBeNull();
    });

    it("should initialize with all stores provided", () => {
      const mockDetailStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockUserStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      const mockCreationStore = { link: null } as unknown as LinkCreationStore;

      const ctx = new GuardContext({
        linkDetailStore: mockDetailStore,
        userLinkStore: mockUserStore,
        linkCreationStore: mockCreationStore,
      });

      expect(ctx.linkDetailStore).toBe(mockDetailStore);
      expect(ctx.userLinkStore).toBe(mockUserStore);
      expect(ctx.linkCreationStore).toBe(mockCreationStore);
    });
  });

  describe("setLinkDetailStore", () => {
    it("should set linkDetailStore", () => {
      const mockStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);

      expect(context.linkDetailStore).toBe(mockStore);
    });
  });

  describe("setUserLinkStore", () => {
    it("should set userLinkStore", () => {
      const mockStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      context.setUserLinkStore(mockStore);

      expect(context.userLinkStore).toBe(mockStore);
    });
  });

  describe("setLinkCreationStore", () => {
    it("should set linkCreationStore", () => {
      const mockStore = { link: null } as unknown as LinkCreationStore;
      context.setLinkCreationStore(mockStore);

      expect(context.linkCreationStore).toBe(mockStore);
    });
  });

  describe("setGuardCheckComplete", () => {
    it("should set isGuardCheckComplete to true", () => {
      context.setGuardCheckComplete(true);
      expect(context.isGuardCheckComplete).toBe(true);
    });

    it("should set isGuardCheckComplete to false", () => {
      context.setGuardCheckComplete(false);
      expect(context.isGuardCheckComplete).toBe(false);
    });
  });

  describe("setHasTempLinkLoadAttempted", () => {
    it("should set hasTempLinkLoadAttempted to true", () => {
      context.setHasTempLinkLoadAttempted(true);
      expect(context.hasTempLinkLoadAttempted).toBe(true);
    });

    it("should set hasTempLinkLoadAttempted to false", () => {
      context.setHasTempLinkLoadAttempted(false);
      expect(context.hasTempLinkLoadAttempted).toBe(false);
    });
  });

  describe("getLinkStore", () => {
    it("should return null when no stores are set", () => {
      expect(context.getLinkStore()).toBeNull();
    });

    it("should return linkDetailStore when only it is set", () => {
      const mockStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);

      expect(context.getLinkStore()).toBe(mockStore);
    });

    it("should return userLinkStore when only it is set", () => {
      const mockStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      context.setUserLinkStore(mockStore);

      expect(context.getLinkStore()).toBe(mockStore);
    });

    it("should return linkCreationStore when only it is set", () => {
      const mockStore = { link: null } as unknown as LinkCreationStore;
      context.setLinkCreationStore(mockStore);

      expect(context.getLinkStore()).toBe(mockStore);
    });

    it("should prioritize linkDetailStore over userLinkStore", () => {
      const mockDetailStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockUserStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;

      context.setLinkDetailStore(mockDetailStore);
      context.setUserLinkStore(mockUserStore);

      expect(context.getLinkStore()).toBe(mockDetailStore);
    });

    it("should prioritize linkDetailStore over linkCreationStore", () => {
      const mockDetailStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockCreationStore = { link: null } as unknown as LinkCreationStore;

      context.setLinkDetailStore(mockDetailStore);
      context.setLinkCreationStore(mockCreationStore);

      expect(context.getLinkStore()).toBe(mockDetailStore);
    });

    it("should prioritize userLinkStore over linkCreationStore", () => {
      const mockUserStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      const mockCreationStore = { link: null } as unknown as LinkCreationStore;

      context.setUserLinkStore(mockUserStore);
      context.setLinkCreationStore(mockCreationStore);

      expect(context.getLinkStore()).toBe(mockUserStore);
    });
  });

  describe("getLink", () => {
    it("should return undefined when no stores are set", () => {
      expect(context.getLink()).toBeUndefined();
    });

    it("should return link from linkDetailStore", () => {
      const mockLink = { id: "123", creator: "principal-123" };
      const mockStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);

      expect(context.getLink()).toBe(mockLink);
    });

    it("should return link from userLinkStore", () => {
      const mockLink = { id: "456", creator: "principal-456" };
      const mockStore = {
        link: mockLink,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      context.setUserLinkStore(mockStore);

      expect(context.getLink()).toBe(mockLink);
    });

    it("should return link from linkCreationStore", () => {
      const mockLink = { id: "789", creator: "principal-789" };
      const mockStore = { link: mockLink } as unknown as LinkCreationStore;
      context.setLinkCreationStore(mockStore);

      expect(context.getLink()).toBe(mockLink);
    });

    it("should prioritize linkDetailStore link", () => {
      const detailLink = { id: "detail" };
      const userLink = { id: "user" };
      const creationLink = { id: "creation" };

      const mockDetailStore = {
        link: detailLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockUserStore = {
        link: userLink,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      const mockCreationStore = {
        link: creationLink,
      } as unknown as LinkCreationStore;

      context.setLinkDetailStore(mockDetailStore);
      context.setUserLinkStore(mockUserStore);
      context.setLinkCreationStore(mockCreationStore);

      expect(context.getLink()).toBe(detailLink);
    });
  });

  describe("isLoading", () => {
    describe("with no stores", () => {
      it("should return true when no stores and hasTempLinkLoadAttempted is false (default checkTempLinkLoad)", () => {
        context.setHasTempLinkLoadAttempted(false);
        expect(context.isLoading()).toBe(true);
      });

      it("should return false when no stores and hasTempLinkLoadAttempted is true (default checkTempLinkLoad)", () => {
        context.setHasTempLinkLoadAttempted(true);
        expect(context.isLoading()).toBe(false);
      });

      it("should return false when checkTempLinkLoad is false regardless of hasTempLinkLoadAttempted", () => {
        context.setHasTempLinkLoadAttempted(false);
        expect(context.isLoading({ checkTempLinkLoad: false })).toBe(false);

        context.setHasTempLinkLoadAttempted(true);
        expect(context.isLoading({ checkTempLinkLoad: false })).toBe(false);
      });
    });

    describe("with linkDetailStore", () => {
      it("should return true when linkDetailStore query is loading", () => {
        const mockStore = {
          link: null,
          query: { isLoading: true },
        } as unknown as LinkDetailStore;
        context.setLinkDetailStore(mockStore);

        expect(context.isLoading()).toBe(true);
      });

      it("should return false when linkDetailStore query is not loading", () => {
        const mockStore = {
          link: null,
          query: { isLoading: false },
        } as unknown as LinkDetailStore;
        context.setLinkDetailStore(mockStore);

        expect(context.isLoading()).toBe(false);
      });
    });

    describe("with userLinkStore", () => {
      it("should return true when userLinkStore linkDetail query is loading", () => {
        const mockStore = {
          link: null,
          linkDetail: {
            link: null,
            query: { isLoading: true },
          },
        } as unknown as UserLinkStore;
        context.setUserLinkStore(mockStore);

        expect(context.isLoading()).toBe(true);
      });

      it("should return false when userLinkStore linkDetail query is not loading", () => {
        const mockStore = {
          link: null,
          linkDetail: {
            link: null,
            query: { isLoading: false },
          },
        } as unknown as UserLinkStore;
        context.setUserLinkStore(mockStore);

        expect(context.isLoading()).toBe(false);
      });

      it("should return false when userLinkStore linkDetail is null", () => {
        const mockStore = {
          link: null,
          linkDetail: null,
        } as unknown as UserLinkStore;
        context.setUserLinkStore(mockStore);

        expect(context.isLoading()).toBe(false);
      });

      it("should return false when userLinkStore linkDetail query is undefined", () => {
        const mockStore = {
          link: null,
          linkDetail: {
            link: null,
            query: undefined,
          },
        } as unknown as UserLinkStore;
        context.setUserLinkStore(mockStore);

        // Should safely handle undefined query with optional chaining
        expect(context.isLoading()).toBe(false);
      });
    });

    describe("with linkCreationStore", () => {
      it("should return true when linkCreationStore exists and hasTempLinkLoadAttempted is false (checkTempLinkLoad=true)", () => {
        const mockStore = { link: null } as unknown as LinkCreationStore;
        context.setLinkCreationStore(mockStore);
        context.setHasTempLinkLoadAttempted(false);

        expect(context.isLoading()).toBe(true);
        expect(context.isLoading({ checkTempLinkLoad: true })).toBe(true);
      });

      it("should return false when linkCreationStore exists and hasTempLinkLoadAttempted is true (checkTempLinkLoad=true)", () => {
        const mockStore = { link: null } as unknown as LinkCreationStore;
        context.setLinkCreationStore(mockStore);
        context.setHasTempLinkLoadAttempted(true);

        expect(context.isLoading()).toBe(false);
        expect(context.isLoading({ checkTempLinkLoad: true })).toBe(false);
      });

      it("should return false when linkCreationStore exists and checkTempLinkLoad is false", () => {
        const mockStore = { link: null } as unknown as LinkCreationStore;
        context.setLinkCreationStore(mockStore);
        context.setHasTempLinkLoadAttempted(false);

        expect(context.isLoading({ checkTempLinkLoad: false })).toBe(false);
      });
    });

    describe("priority checks", () => {
      it("should check linkDetailStore first even if other stores exist", () => {
        const mockDetailStore = {
          link: null,
          query: { isLoading: true },
        } as unknown as LinkDetailStore;
        const mockUserStore = {
          link: null,
          linkDetail: { link: null, query: { isLoading: false } },
        } as unknown as UserLinkStore;
        const mockCreationStore = {
          link: null,
        } as unknown as LinkCreationStore;

        context.setLinkDetailStore(mockDetailStore);
        context.setUserLinkStore(mockUserStore);
        context.setLinkCreationStore(mockCreationStore);

        // Should return linkDetailStore's loading state (true)
        expect(context.isLoading()).toBe(true);
      });

      it("should check userLinkStore second if linkDetailStore doesn't exist", () => {
        const mockUserStore = {
          link: null,
          linkDetail: { link: null, query: { isLoading: true } },
        } as unknown as UserLinkStore;
        const mockCreationStore = {
          link: null,
        } as unknown as LinkCreationStore;

        context.setUserLinkStore(mockUserStore);
        context.setLinkCreationStore(mockCreationStore);

        // Should return userLinkStore's loading state (true), not check linkCreationStore
        expect(context.isLoading()).toBe(true);
      });
    });
  });

  describe("hasLink", () => {
    it("should return false when no stores exist", () => {
      expect(context.hasLink()).toBe(false);
    });

    it("should return true when linkCreationStore exists", () => {
      const mockStore = { link: null } as unknown as LinkCreationStore;
      context.setLinkCreationStore(mockStore);

      expect(context.hasLink()).toBe(true);
    });

    it("should return true when linkDetailStore has a link", () => {
      const mockLink = { id: "123", creator: "principal-123" };
      const mockStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);

      expect(context.hasLink()).toBe(true);
    });

    it("should return false when linkDetailStore link is null", () => {
      const mockStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);

      expect(context.hasLink()).toBe(false);
    });

    it("should return false when linkDetailStore link is undefined", () => {
      const mockStore = {
        link: undefined,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);

      expect(context.hasLink()).toBe(false);
    });

    it("should return true when userLinkStore has a link", () => {
      const mockLink = { id: "456", creator: "principal-456" };
      const mockStore = {
        link: mockLink,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      context.setUserLinkStore(mockStore);

      expect(context.hasLink()).toBe(true);
    });

    it("should return false when userLinkStore link is null", () => {
      const mockStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      context.setUserLinkStore(mockStore);

      expect(context.hasLink()).toBe(false);
    });

    it("should return false when userLinkStore link is undefined", () => {
      const mockStore = {
        link: undefined,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;
      context.setUserLinkStore(mockStore);

      expect(context.hasLink()).toBe(false);
    });

    it("should prioritize linkCreationStore and return true even if other stores have no links", () => {
      const mockCreationStore = { link: null } as unknown as LinkCreationStore;
      const mockDetailStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockUserStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;

      context.setLinkCreationStore(mockCreationStore);
      context.setLinkDetailStore(mockDetailStore);
      context.setUserLinkStore(mockUserStore);

      // Should return true because linkCreationStore exists
      expect(context.hasLink()).toBe(true);
    });

    it("should check linkDetailStore before userLinkStore", () => {
      const detailLink = { id: "detail" };
      const mockDetailStore = {
        link: detailLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockUserStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;

      context.setLinkDetailStore(mockDetailStore);
      context.setUserLinkStore(mockUserStore);

      // Should return true based on linkDetailStore, not check userLinkStore
      expect(context.hasLink()).toBe(true);
    });

    it("should return false when linkDetailStore has no link but userLinkStore also has no link", () => {
      const mockDetailStore = {
        link: null,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      const mockUserStore = {
        link: null,
        linkDetail: { link: null, query: { isLoading: false } },
      } as unknown as UserLinkStore;

      context.setLinkDetailStore(mockDetailStore);
      context.setUserLinkStore(mockUserStore);

      expect(context.hasLink()).toBe(false);
    });
  });

  describe("isOwner", () => {
    it("should return true if linkCreationStore exists", () => {
      const mockStore = { link: null } as unknown as LinkCreationStore;
      context.setLinkCreationStore(mockStore);

      expect(context.isOwner()).toBe(true);
    });

    it("should return false if no account in authState", () => {
      const mockLink = {
        id: "123",
        creator: { toString: () => "principal-123" },
      };
      const mockStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);
      mockAuthState.account = null;

      expect(context.isOwner()).toBe(false);
    });

    it("should return false if link has no creator", () => {
      const mockLink = { id: "123", creator: null };
      const mockStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);
      mockAuthState.account = { owner: "principal-456" };

      expect(context.isOwner()).toBe(false);
    });

    it("should return false if getLink returns undefined", () => {
      mockAuthState.account = { owner: "principal-456" };

      expect(context.isOwner()).toBe(false);
    });

    it("should return true if creator matches account owner", () => {
      const mockLink = {
        id: "123",
        creator: { toString: () => "principal-123" },
      };
      const mockStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);
      mockAuthState.account = { owner: "principal-123" };

      expect(context.isOwner()).toBe(true);
    });

    it("should return false if creator does not match account owner", () => {
      const mockLink = {
        id: "123",
        creator: { toString: () => "principal-123" },
      };
      const mockStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;
      context.setLinkDetailStore(mockStore);
      mockAuthState.account = { owner: "principal-456" };

      expect(context.isOwner()).toBe(false);
    });

    it("should prioritize linkCreationStore existence over ownership check", () => {
      const mockCreationStore = { link: null } as unknown as LinkCreationStore;
      const mockLink = {
        id: "123",
        creator: { toString: () => "principal-999" },
      };
      const mockDetailStore = {
        link: mockLink,
        query: { isLoading: false },
      } as unknown as LinkDetailStore;

      context.setLinkCreationStore(mockCreationStore);
      context.setLinkDetailStore(mockDetailStore);
      mockAuthState.account = { owner: "principal-123" };

      // Should return true because linkCreationStore exists
      expect(context.isOwner()).toBe(true);
    });
  });
});
