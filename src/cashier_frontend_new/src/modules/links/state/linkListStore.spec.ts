import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinkListStore } from "$modules/links/state/linkListStore.svelte";
import { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import { UnifiedLinkItemMapper } from "$modules/links/types/linkList";
import { Principal } from "@icp-sdk/core/principal";
import { managedState } from "$lib/managedState";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
} from "$shared";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

vi.mock("$lib/managedState", () => ({
  managedState: vi.fn(),
}));

vi.mock("$modules/creationLink/repositories/draftLinkRepository", () => ({
  draftLinkRepository: {
    get: vi.fn(() => []),
  },
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: {
      owner: "test-owner",
    },
  },
}));

type MockManagedState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown | undefined;
  isSuccess: boolean;
  refresh: (interval?: number) => void;
  reset: () => void;
};

describe("LinkListStore.getLinks", () => {
  let store: LinkListStore;
  let mockQuery: MockManagedState<Link[]>;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();

    mockQuery = {
      data: undefined,
      refresh: vi.fn(),
      isLoading: false,
      error: undefined,
      isSuccess: true,
      reset: vi.fn(),
    };
    const mockManagedState = vi.mocked(managedState);
    mockManagedState.mockReturnValue(
      mockQuery as unknown as ReturnType<typeof managedState>,
    );
    store = new LinkListStore();
  });

  it("should return empty array when no data", () => {
    mockQuery.data = undefined;
    vi.mocked(draftLinkRepository.get).mockReturnValue([]);

    const result = store.getLinks();

    expect(result).toEqual([]);
  });

  it("should return only persisted links when no draft links", () => {
    const mockLink = new Link(
      "link-1",
      "Persisted Link",
      Principal.fromText("aaaaa-aa"),
      [],
      LinkType.TIP,
      BigInt(Date.now()),
      LinkState.ACTIVE,
      BigInt(1),
      BigInt(0),
    );

    mockQuery.data = [mockLink];
    vi.mocked(draftLinkRepository.get).mockReturnValue([]);

    const result = store.getLinks();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(UnifiedLinkItemMapper.fromLink(mockLink));
  });

  it("should return only draft links when no persisted links", () => {
    const mockDraftLink = {
      id: "draft-1",
      title: "Draft",
      link_type: SharedLinkType.SendTip,
      link_state: SharedLinkState.ChooseType,
      creator: Principal.fromText("aaaaa-aa"),
      asset_info: [],
      max_use: 1n,
      use_count: 0n,
      created_at: BigInt(Date.now()),
    };

    mockQuery.data = undefined;
    vi.mocked(draftLinkRepository.get).mockReturnValue([mockDraftLink]);

    const result = store.getLinks();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      UnifiedLinkItemMapper.fromDraftLink(mockDraftLink),
    );
  });

  it("should return unified array of both persisted links and draft links", () => {
    const mockLink = new Link(
      "link-1",
      "Persisted Link",
      Principal.fromText("aaaaa-aa"),
      [],
      LinkType.TIP,
      BigInt(Date.now()),
      LinkState.ACTIVE,
      BigInt(1),
      BigInt(0),
    );

    const mockDraftLink = {
      id: "draft-1",
      title: "Draft Link",
      link_type: SharedLinkType.SendTip,
      link_state: SharedLinkState.Preview,
      creator: Principal.fromText("aaaaa-aa"),
      asset_info: [],
      max_use: 1n,
      use_count: 0n,
      created_at: BigInt(Date.now()),
    };

    mockQuery.data = [mockLink];
    vi.mocked(draftLinkRepository.get).mockReturnValue([mockDraftLink]);

    const result = store.getLinks();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(UnifiedLinkItemMapper.fromLink(mockLink));
    expect(result[1]).toEqual(
      UnifiedLinkItemMapper.fromDraftLink(mockDraftLink),
    );
  });
});

describe("LinkListStore.onboarding", () => {
  let store: LinkListStore;
  let mockQuery: MockManagedState<Link[]>;

  beforeEach(() => {
    localStorageMock.clear();

    mockQuery = {
      data: undefined,
      refresh: vi.fn(),
      isLoading: false,
      error: undefined,
      isSuccess: true,
      reset: vi.fn(),
    };
    const mockManagedState = vi.mocked(managedState);
    mockManagedState.mockReturnValue(
      mockQuery as unknown as ReturnType<typeof managedState>,
    );
    store = new LinkListStore();
  });

  it("should return false for isOnboardingDismissed initially", () => {
    expect(store.isOnboardingDismissed).toBe(false);
  });

  it("should set isOnboardingDismissed to true after dismissOnboarding", () => {
    store.dismissOnboarding();
    expect(store.isOnboardingDismissed).toBe(true);
  });

  it("should persist dismissal to localStorage", () => {
    store.dismissOnboarding();
    expect(localStorageMock.getItem("onboarding_link_list_dismissed")).toBe(
      "true",
    );
  });

  it("should read persisted value from localStorage on initialization", () => {
    localStorageMock.setItem("onboarding_link_list_dismissed", "true");
    const newStore = new LinkListStore();
    expect(newStore.isOnboardingDismissed).toBe(true);
  });
});
