import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinkListStore } from "./linkListStore.svelte";
import { Link } from "../types/link/link";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
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

vi.mock("../repositories/tempLinkRepository", () => ({
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

describe("LinkListStore.groupAndSortByDate", () => {
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

  const makeLink = (create_at: bigint) =>
    new Link(
      "id",
      "title",
      Principal.fromText("aaaaa-aa"),
      [],
      LinkType.TIP,
      create_at,
      LinkState.ACTIVE,
      0n,
      0n,
    );

  it("returns empty array for empty input", () => {
    mockQuery.data = [];
    const result = store.groupAndSortByDate();
    expect(result).toEqual([]);
  });

  it("groups single link", () => {
    const link = makeLink(1700000000000000000n);
    mockQuery.data = [link];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link]);
  });

  it("groups multiple links on same day", () => {
    const baseTime = 1700000000000000000n;
    const link1 = makeLink(baseTime);
    const link2 = makeLink(baseTime + 60n * 60n * 1000000000n); // +1 hour
    mockQuery.data = [link1, link2];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link1, link2]);
  });

  it("groups links on different days and sorts descending", () => {
    const day1 = 1700000000000000000n;
    const day2 = day1 + 24n * 60n * 60n * 1000000000n; // +1 day
    const link1 = makeLink(day1);
    const link2 = makeLink(day2);
    mockQuery.data = [link1, link2];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(2);
    expect(result[0].date).toBeGreaterThan(result[1].date); // Descending
    expect(result[0].links).toEqual([link2]);
    expect(result[1].links).toEqual([link1]);
  });

  it("handles links with same timestamp", () => {
    const time = 1700000000000000000n;
    const link1 = makeLink(time);
    const link2 = makeLink(time);
    mockQuery.data = [link1, link2];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link1, link2]);
  });

  it("includes temp links in grouping", () => {
    const time = 1700000000000000000n;
    const link = makeLink(time);
    const tempLink = new TempLink(
      "temp-1",
      time,
      LinkState.PREVIEW,
      new CreateLinkData({
        title: "Draft",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );

    mockQuery.data = [link];
    vi.mocked(tempLinkRepository.get).mockReturnValue([tempLink]);

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toHaveLength(2);
    expect(result[0].links).toContain(link);
    expect(result[0].links).toContain(tempLink);
  });

  it("groups temp links and persisted links on different days", () => {
    const day1 = 1700000000000000000n;
    const day2 = day1 + 24n * 60n * 60n * 1000000000n; // +1 day
    const day3 = day2 + 24n * 60n * 60n * 1000000000n; // +1 day

    const link = makeLink(day1);
    const tempLink = new TempLink(
      "temp-1",
      day2,
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "Draft",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    const tempLink2 = new TempLink(
      "temp-1",
      day3,
      LinkState.CHOOSING_TYPE,
      new CreateLinkData({
        title: "Draft",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );

    mockQuery.data = [link];
    vi.mocked(tempLinkRepository.get).mockReturnValue([tempLink, tempLink2]);

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(3);
    expect(result[0].date).toBeGreaterThan(result[1].date);
    expect(result[1].date).toBeGreaterThan(result[2].date);
    expect(result[0].links).toEqual([tempLink2]);
    expect(result[1].links).toEqual([tempLink]);
    expect(result[2].links).toEqual([link]);
  });

  it("handles only temp links", () => {
    const time = 1700000000000000000n;
    const tempLink1 = new TempLink(
      "temp-1",
      time,
      LinkState.ADDING_ASSET,
      new CreateLinkData({
        title: "Draft 1",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );
    const tempLink2 = new TempLink(
      "temp-2",
      time + 60n * 60n * 1000000000n, // +1 hour
      LinkState.PREVIEW,
      new CreateLinkData({
        title: "Draft 2",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );

    mockQuery.data = [];
    vi.mocked(tempLinkRepository.get).mockReturnValue([tempLink1, tempLink2]);

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toHaveLength(2);
    expect(result[0].links).toContain(tempLink1);
    expect(result[0].links).toContain(tempLink2);
  });

  it("returns empty array when no links and no temp links", () => {
    mockQuery.data = [];
    vi.mocked(tempLinkRepository.get).mockReturnValue([]);

    const result = store.groupAndSortByDate();

    expect(result).toEqual([]);
  });
});

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
    expect(result[0]).toBe(mockLink);
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
    expect(result[0]).toBe(mockTempLink);
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
    expect(result[0]).toBe(mockLink);
    expect(result[1]).toBe(mockTempLink);
  });
});
