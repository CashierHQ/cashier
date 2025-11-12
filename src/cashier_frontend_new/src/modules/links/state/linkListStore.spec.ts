import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinkListStore } from "./linkListStore.svelte";
import { Link } from "../types/link/link";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { UnifiedLinkItemMapper } from "../types/linkList";
import { Principal } from "@dfinity/principal";
import { managedState } from "$lib/managedState";
import { TempLink } from "../types/tempLink";
import { CreateLinkData } from "$modules/creationLink/types/createLinkData";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";

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

vi.mock("$modules/creationLink/repositories/tempLinkRepository", () => ({
  tempLinkRepository: {
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
    vi.mocked(tempLinkRepository.get).mockReturnValue([]);

    const result = store.getLinks();

    expect(result).toEqual([]);
  });

  it("should return only persisted links when no temp links", () => {
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
    vi.mocked(tempLinkRepository.get).mockReturnValue([]);

    const result = store.getLinks();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(UnifiedLinkItemMapper.fromLink(mockLink));
  });

  it("should return only temp links when no persisted links", () => {
    const mockTempLink = new TempLink(
      "temp-1",
      BigInt(Date.now()),
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "Draft",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );

    mockQuery.data = undefined;
    vi.mocked(tempLinkRepository.get).mockReturnValue([mockTempLink]);

    const result = store.getLinks();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(UnifiedLinkItemMapper.fromTempLink(mockTempLink));
  });

  it("should return unified array of both persisted links and temp links", () => {
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

    const mockTempLink = new TempLink(
      "temp-1",
      BigInt(Date.now()),
      LinkState.PREVIEW,
      new CreateLinkData({
        title: "Draft Link",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );

    mockQuery.data = [mockLink];
    vi.mocked(tempLinkRepository.get).mockReturnValue([mockTempLink]);

    const result = store.getLinks();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(UnifiedLinkItemMapper.fromLink(mockLink));
    expect(result[1]).toEqual(UnifiedLinkItemMapper.fromTempLink(mockTempLink));
  });
});
