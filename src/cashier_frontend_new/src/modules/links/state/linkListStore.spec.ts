import { describe, it, expect, beforeEach } from "vitest";
import { LinkListStore } from "./linkListStore.svelte";
import { Link } from "../types/link/link";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { Principal } from "@dfinity/principal";

describe("LinkListStore.groupAndSortByDate", () => {
  class TestLinkListStore extends LinkListStore {
    private _testLinks: Link[] = [];

    set testLinks(links: Link[]) {
      this._testLinks = links;
    }

    get links(): Link[] {
      return this._testLinks;
    }
  }

  let store: TestLinkListStore;

  beforeEach(() => {
    store = new TestLinkListStore();
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
    store.testLinks = [];
    const result = store.groupAndSortByDate();
    expect(result).toEqual([]);
  });

  it("groups single link", () => {
    const link = makeLink(1700000000000000000n);
    store.testLinks = [link];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link]);
  });

  it("groups multiple links on same day", () => {
    const baseTime = 1700000000000000000n;
    const link1 = makeLink(baseTime);
    const link2 = makeLink(baseTime + 60n * 60n * 1000000000n); // +1 hour
    store.testLinks = [link1, link2];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link1, link2]);
  });

  it("groups links on different days and sorts descending", () => {
    const day1 = 1700000000000000000n;
    const day2 = day1 + 24n * 60n * 60n * 1000000000n; // +1 day
    const link1 = makeLink(day1);
    const link2 = makeLink(day2);
    store.testLinks = [link1, link2];

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
    store.testLinks = [link1, link2];

    const result = store.groupAndSortByDate();

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link1, link2]);
  });
});
