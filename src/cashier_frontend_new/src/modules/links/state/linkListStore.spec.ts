import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinkListStore } from "./linkListStore.svelte";
import { Link } from "../types/link/link";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { Principal } from "@dfinity/principal";
import { managedState } from "$lib/managedState";

vi.mock("$lib/managedState", () => ({
  managedState: vi.fn(),
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
});
