import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinkListStore } from "$modules/links/state/linkListStore.svelte";
import { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import { UnifiedLinkItemMapper } from "$modules/links/types/linkList";
import { Principal } from "@icp-sdk/core/principal";
import { managedState } from "$lib/managedState";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { Ok, Err } from "ts-results-es";
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

vi.mock("$modules/links/services/cashierBackend", () => ({
  cashierBackendService: {
    getLinksV3: vi.fn(),
  },
}));

vi.mock("$modules/links/utils/linkV3Mapper", () => ({
  mapV3LinkToFrontend: vi.fn((l: unknown) => l),
}));

type MockManagedState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown | undefined;
  isSuccess: boolean;
  refresh: (interval?: number) => void;
  refreshAsync: () => Promise<void>;
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
      refreshAsync: vi.fn().mockResolvedValue(undefined),
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

describe("LinkListStore.loading", () => {
  let store: LinkListStore;
  let mockQuery: MockManagedState<Link[]>;

  beforeEach(() => {
    localStorageMock.clear();

    mockQuery = {
      data: undefined,
      refresh: vi.fn(),
      refreshAsync: vi.fn().mockResolvedValue(undefined),
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

  it("should show initial persisted links loading before data exists", () => {
    mockQuery.isLoading = true;
    mockQuery.data = undefined;

    expect(store.isLoadingInitialPersistedLinks).toBe(true);
  });

  it("should show initial persisted links loading when current data is empty", () => {
    mockQuery.isLoading = true;
    mockQuery.data = [];

    expect(store.isLoadingInitialPersistedLinks).toBe(true);
  });

  it("should not show initial persisted links loading when persisted links exist", () => {
    mockQuery.isLoading = true;
    mockQuery.data = [
      new Link(
        "link-1",
        "Persisted Link",
        Principal.fromText("aaaaa-aa"),
        [],
        LinkType.TIP,
        BigInt(Date.now()),
        LinkState.ACTIVE,
        BigInt(1),
        BigInt(0),
      ),
    ];

    expect(store.isLoadingInitialPersistedLinks).toBe(false);
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
      refreshAsync: vi.fn().mockResolvedValue(undefined),
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

describe("LinkListStore.pagination", () => {
  let store: LinkListStore;
  let mockQuery: MockManagedState<Link[]>;

  function latestQueryFn(): () => Promise<Link[]> {
    const calls = vi.mocked(managedState).mock.calls;
    return calls[calls.length - 1][0].queryFn as () => Promise<Link[]>;
  }

  beforeEach(() => {
    localStorageMock.clear();
    vi.mocked(cashierBackendService.getLinksV3).mockReset();

    mockQuery = {
      data: undefined,
      refresh: vi.fn(),
      refreshAsync: vi.fn().mockResolvedValue(undefined),
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

  it("should request offset 0 and the default page size on the initial fetch", async () => {
    vi.mocked(cashierBackendService.getLinksV3).mockResolvedValue(
      Ok({
        data: [],
        metadata: {
          total: 0n,
          offset: 0n,
          limit: 100n,
          is_next: false,
          is_prev: false,
        },
      }) as never,
    );

    await latestQueryFn()();

    expect(cashierBackendService.getLinksV3).toHaveBeenCalledWith({
      offset: 0,
      limit: 100,
    });
  });

  it("should expose hasMore true when the backend reports more links", async () => {
    vi.mocked(cashierBackendService.getLinksV3).mockResolvedValue(
      Ok({
        data: [],
        metadata: {
          total: 250n,
          offset: 0n,
          limit: 100n,
          is_next: true,
          is_prev: false,
        },
      }) as never,
    );

    expect(store.hasMore).toBe(false);
    await latestQueryFn()();
    expect(store.hasMore).toBe(true);
  });

  it("should expose hasMore false when the backend request fails", async () => {
    vi.mocked(cashierBackendService.getLinksV3).mockResolvedValue(
      Err(new Error("network error")) as never,
    );

    await latestQueryFn()();

    expect(store.hasMore).toBe(false);
  });

  it("should grow the requested limit and call refreshAsync on loadMore", async () => {
    vi.mocked(cashierBackendService.getLinksV3).mockResolvedValue(
      Ok({
        data: [],
        metadata: {
          total: 250n,
          offset: 0n,
          limit: 100n,
          is_next: true,
          is_prev: false,
        },
      }) as never,
    );
    await latestQueryFn()();
    expect(store.hasMore).toBe(true);

    await store.loadMore();

    expect(mockQuery.refreshAsync).toHaveBeenCalledTimes(1);

    // Simulate what refreshAsync would trigger internally: the queryFn runs
    // again and should now request the grown limit.
    await latestQueryFn()();
    expect(cashierBackendService.getLinksV3).toHaveBeenLastCalledWith({
      offset: 0,
      limit: 200,
    });
  });

  it("should no-op loadMore when there is nothing more to load", async () => {
    vi.mocked(cashierBackendService.getLinksV3).mockResolvedValue(
      Ok({
        data: [],
        metadata: {
          total: 1n,
          offset: 0n,
          limit: 100n,
          is_next: false,
          is_prev: false,
        },
      }) as never,
    );
    await latestQueryFn()();
    expect(store.hasMore).toBe(false);

    await store.loadMore();

    expect(mockQuery.refreshAsync).not.toHaveBeenCalled();
  });

  it("should no-op loadMore while a load is already in flight", async () => {
    vi.mocked(cashierBackendService.getLinksV3).mockResolvedValue(
      Ok({
        data: [],
        metadata: {
          total: 250n,
          offset: 0n,
          limit: 100n,
          is_next: true,
          is_prev: false,
        },
      }) as never,
    );
    await latestQueryFn()();

    let resolveRefresh: () => void = () => {};
    mockQuery.refreshAsync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const first = store.loadMore();
    const second = store.loadMore();
    resolveRefresh();
    await Promise.all([first, second]);

    expect(mockQuery.refreshAsync).toHaveBeenCalledTimes(1);
  });
});
