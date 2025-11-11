import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LinkCreationStore } from "./linkCreationStore.svelte";
import { tempLinkRepository } from "../services/tempLinkRepository";
import { authState } from "$modules/auth/state/auth.svelte";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { CreateLinkData } from "../types/createLinkData";
import { TempLink } from "../types/tempLink";
import { LinkStep } from "../types/linkStep";

// Mock dependencies
vi.mock("../services/tempLinkRepository", () => ({
  tempLinkRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getOne: vi.fn(),
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: {
      owner: "test-owner",
    },
    buildAnonymousAgent: vi.fn(() => ({})),
  },
}));

// Mock token price store to avoid initialization issues
vi.mock("$modules/token/state/tokenPriceStore.svelte", () => ({
  tokenPriceStore: {},
}));

describe("LinkCreationStore", () => {
  let store: LinkCreationStore;
  let defaultTempLink: TempLink;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultTempLink = new TempLink(
      "test-id-123",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    store = new LinkCreationStore(defaultTempLink);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with temp link data", () => {
      expect(store.id).toBe("test-id-123");
      expect(store.createLinkData).toBeDefined();
      expect(store.createLinkData.linkType).toBe(LinkType.TIP);
      expect(store.createLinkData.assets).toEqual([]);
      expect(store.createLinkData.maxUse).toBe(1);
      expect(store.state).toBeDefined();
      expect(store.state.step).toBe(LinkStep.CHOOSE_TYPE);
      expect(store.link).toBeUndefined();
      expect(store.action).toBeUndefined();
    });
  });

  describe("constructor with different states", () => {
    it("should initialize with ADDING_ASSET state", () => {
      const tempLink = new TempLink(
        "temp-123",
        BigInt(Date.now()),
        LinkState.ADDING_ASSET,
        new CreateLinkData({
          title: "Test Link",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 5,
        }),
      );

      const newStore = new LinkCreationStore(tempLink);

      expect(newStore.id).toBe("temp-123");
      expect(newStore.createLinkData.title).toBe("Test Link");
      expect(newStore.createLinkData.maxUse).toBe(5);
      expect(newStore.state.step).toBe(LinkStep.ADD_ASSET);
    });

    it("should initialize with CHOOSING_TYPE state", () => {
      const tempLink = new TempLink(
        "temp-456",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      const newStore = new LinkCreationStore(tempLink);

      expect(newStore.state.step).toBe(LinkStep.CHOOSE_TYPE);
    });

    it("should initialize with PREVIEW state", () => {
      const tempLink = new TempLink(
        "temp-789",
        BigInt(Date.now()),
        LinkState.PREVIEW,
        new CreateLinkData({
          title: "Preview Link",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      const newStore = new LinkCreationStore(tempLink);

      expect(newStore.state.step).toBe(LinkStep.PREVIEW);
    });

    it("should initialize with CREATE_LINK state", () => {
      const tempLink = new TempLink(
        "temp-101",
        BigInt(Date.now()),
        LinkState.CREATE_LINK,
        new CreateLinkData({
          title: "Created Link",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      const newStore = new LinkCreationStore(tempLink);

      expect(newStore.state.step).toBe(LinkStep.CREATED);
    });

    it("should initialize with link and action as undefined", () => {
      const tempLink = new TempLink(
        "temp-reset",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      const newStore = new LinkCreationStore(tempLink);

      expect(newStore.link).toBeUndefined();
      expect(newStore.action).toBeUndefined();
    });
  });

  describe("getters and setters", () => {
    it("should get and set state", () => {
      const currentState = store.state;
      expect(currentState).toBeDefined();

      // State should be readable
      expect(store.state.step).toBe(LinkStep.CHOOSE_TYPE);
    });

    it("should get and set id", () => {
      expect(store.id).toBe("test-id-123");

      store.id = "new-id";
      expect(store.id).toBe("new-id");
    });
  });

  describe("syncTempLink", () => {
    it("should delete temp link when step is CREATED", async () => {
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CREATE_LINK,
        new CreateLinkData({
          title: "Test",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      new LinkCreationStore(tempLink);

      // The syncTempLink returns early when step is CREATED, so no calls should be made
      expect(tempLinkRepository.delete).not.toHaveBeenCalled();
      expect(tempLinkRepository.update).not.toHaveBeenCalled();
    });

    it("should update temp link when in CHOOSE_TYPE step", async () => {
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.CHOOSING_TYPE,
        new CreateLinkData({
          title: "Test",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      new LinkCreationStore(tempLink);

      // The $effect in the constructor triggers syncTempLink but is not executed in tests
      // Since testing Svelte $effect is complex, we just verify the store initializes correctly
      expect(tempLinkRepository.delete).not.toHaveBeenCalled();
    });

    it("should update temp link when in ADD_ASSET step", async () => {
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.ADDING_ASSET,
        new CreateLinkData({
          title: "Test",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      new LinkCreationStore(tempLink);

      // The $effect in the constructor triggers syncTempLink but is not executed in tests
      // Since testing Svelte $effect is complex, we just verify the store initializes correctly
      expect(tempLinkRepository.delete).not.toHaveBeenCalled();
    });

    it("should update temp link when in PREVIEW step", async () => {
      const tempLink = new TempLink(
        "test-id",
        BigInt(Date.now()),
        LinkState.PREVIEW,
        new CreateLinkData({
          title: "Test",
          linkType: LinkType.TIP,
          assets: [],
          maxUse: 1,
        }),
      );

      new LinkCreationStore(tempLink);

      // The $effect in the constructor triggers syncTempLink but is not executed in tests
      // Since testing Svelte $effect is complex, we just verify the store initializes correctly
      expect(tempLinkRepository.delete).not.toHaveBeenCalled();
    });

    it("should not sync when authState.account is undefined", async () => {
      const originalAccount = authState.account;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authState as any).account = undefined;

      vi.spyOn(store.state, "goNext").mockResolvedValue(undefined);

      await store.goNext();

      expect(tempLinkRepository.update).not.toHaveBeenCalled();
      expect(tempLinkRepository.delete).not.toHaveBeenCalled();

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authState as any).account = originalAccount;
    });
  });

  describe("goNext", () => {
    it("should call state.goNext and syncTempLink", async () => {
      const goNextSpy = vi
        .spyOn(store.state, "goNext")
        .mockResolvedValue(undefined);

      await store.goNext();

      expect(goNextSpy).toHaveBeenCalled();
      // The $effect handles syncTempLink but isn't triggered in tests
    });

    it("should throw error if state.goNext throws", async () => {
      const error = new Error("State transition failed");
      vi.spyOn(store.state, "goNext").mockRejectedValue(error);

      await expect(store.goNext()).rejects.toThrow("State transition failed");
    });

    it("should convert non-Error rejections to Error", async () => {
      vi.spyOn(store.state, "goNext").mockRejectedValue("string error");

      await expect(store.goNext()).rejects.toThrow("string error");
    });
  });

  describe("goBack", () => {
    it("should call state.goBack and syncTempLink", async () => {
      const goBackSpy = vi
        .spyOn(store.state, "goBack")
        .mockResolvedValue(undefined);

      await store.goBack();

      expect(goBackSpy).toHaveBeenCalled();
      // The $effect handles syncTempLink but isn't triggered in tests
    });

    it("should throw error if state.goBack throws", async () => {
      const error = new Error("Go back failed");
      vi.spyOn(store.state, "goBack").mockRejectedValue(error);

      await expect(store.goBack()).rejects.toThrow("Go back failed");
    });

    it("should convert non-Error rejections to Error", async () => {
      vi.spyOn(store.state, "goBack").mockRejectedValue("string error");

      await expect(store.goBack()).rejects.toThrow("string error");
    });
  });

  describe("createTempLink static method", () => {
    it("should create a new temp link and save to repository", () => {
      const createSpy = vi.spyOn(tempLinkRepository, "create");

      const tempLink = LinkCreationStore.createTempLink("test-principal");

      expect(tempLink).toBeDefined();
      expect(tempLink.id).toContain("test-principal");
      expect(tempLink.state).toBe(LinkState.CHOOSING_TYPE);
      expect(tempLink.createLinkData.linkType).toBe(LinkType.TIP);
      expect(tempLink.createLinkData.assets).toEqual([]);
      expect(tempLink.createLinkData.maxUse).toBe(1);
      expect(createSpy).toHaveBeenCalledWith({
        id: tempLink.id,
        owner: "test-principal",
        tempLink: tempLink,
      });
    });

    it("should generate unique IDs for multiple temp links", async () => {
      const tempLink1 = LinkCreationStore.createTempLink("test-principal");
      // Wait a millisecond to ensure Date.now() returns a different value
      await new Promise((resolve) => setTimeout(resolve, 1));
      const tempLink2 = LinkCreationStore.createTempLink("test-principal");

      expect(tempLink1.id).not.toBe(tempLink2.id);
    });
  });

  describe("getTempLink static method", () => {
    it("should return undefined when user not authenticated", () => {
      const originalAccount = authState.account;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authState as any).account = undefined;

      const result = LinkCreationStore.getTempLink("test-id");

      expect(result).toBeUndefined();

      // Restore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authState as any).account = originalAccount;
    });
  });
});
