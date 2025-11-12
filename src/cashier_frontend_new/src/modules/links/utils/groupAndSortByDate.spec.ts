import { describe, it, expect } from "vitest";
import { groupAndSortByDate } from "./groupAndSortByDate";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
// tests use plain UnifiedLinkItem objects; no CreateLinkData required
import type { UnifiedLinkItem } from "../types/linkList";

const makeLink = (create_at: bigint): UnifiedLinkItem => ({
  id: "id" + create_at.toString(),
  title: "title",
  linkCreateAt: create_at,
  state: LinkState.ACTIVE,
  linkType: LinkType.TIP,
});

describe("groupAndSortByDate util", () => {
  it("returns empty array for empty input", () => {
    const result = groupAndSortByDate([]);
    expect(result).toEqual([]);
  });

  it("groups single link", () => {
    const link = makeLink(1746835200000000000n);
    const result = groupAndSortByDate([link]);

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link]);
  });

  it("groups multiple links on same day", () => {
    const baseTime = 1746835200000000000n; // Specific day timestamp
    const link1 = makeLink(baseTime);
    const link2 = makeLink(baseTime + 60n * 60n * 1000000000n); // +1 hour
    const link3 = makeLink(baseTime + 2n * 60n * 60n * 1000000000n); // +2 hour

    const result = groupAndSortByDate([link1, link2, link3]);

    expect(result[0].links).toEqual([link3, link2, link1]);
  });

  it("groups links on different days and sorts descending", () => {
    const day1 = 1746835200000000000n;
    const day2 = day1 + 24n * 60n * 60n * 1000000000n; // +1 day
    const link1 = makeLink(day1);
    const link2 = makeLink(day2);
    const result = groupAndSortByDate([link1, link2]);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBeGreaterThan(result[1].date); // Descending
    expect(result[0].links).toEqual([link2]);
    expect(result[1].links).toEqual([link1]);
  });

  it("handles links with same timestamp", () => {
    const time = 1746835200000000000n;
    const link1 = makeLink(time);
    const link2 = makeLink(time);
    const result = groupAndSortByDate([link1, link2]);

    expect(result).toHaveLength(1);
    expect(result[0].links).toEqual([link1, link2]);
  });

  it("includes temp links in grouping", () => {
    const time = 1746835200000000000n;
    const link = makeLink(time);
    const link2 = makeLink(time + 60n * 60n * 1000000000n); // +1 hour

    const result = groupAndSortByDate([link, link2]);

    expect(result).toHaveLength(1);
    expect(result[0].links).toHaveLength(2);
    expect(result[0].links).toContainEqual(link);
    expect(result[0].links).toContainEqual(link2);
  });

  it("groups temp links and persisted links on different days", () => {
    const day1 = 1746835200000000000n;
    const day2 = day1 + 24n * 60n * 60n * 1000000000n; // +1 day
    const day3 = day2 + 24n * 60n * 60n * 1000000000n; // +1 day

    const link = makeLink(day1);
    const link2 = makeLink(day2);
    const link3 = makeLink(day3);
    link2.title = "Temp Link 1";
    link3.title = "Temp Link 2";

    const result = groupAndSortByDate([link, link2, link3]);

    expect(result).toHaveLength(3);
    expect(result[0].date).toBeGreaterThan(result[1].date);
    expect(result[1].date).toBeGreaterThan(result[2].date);
    expect(result[0].links).toEqual([link3]);
    expect(result[1].links).toEqual([link2]);
    expect(result[2].links).toEqual([link]);
  });

  it("handles only temp links", () => {
    const time = 1746835200000000000n;
    const tempLink1: UnifiedLinkItem = {
      id: "t1",
      title: "Temp 1",
      linkCreateAt: time,
      state: LinkState.ADDING_ASSET,
      linkType: LinkType.TIP,
    };
    const tempLink2: UnifiedLinkItem = {
      id: "t2",
      title: "Temp 2",
      linkCreateAt: time + 60n * 60n * 1000000000n,
      state: LinkState.PREVIEW,
      linkType: LinkType.TIP,
    };

    const result = groupAndSortByDate([tempLink1, tempLink2]);

    expect(result).toHaveLength(1);
    expect(result[0].links).toHaveLength(2);
    expect(result[0].links).toContainEqual(tempLink1);
    expect(result[0].links).toContainEqual(tempLink2);
  });

  it("sorts links within same day by newest first (temp link newest)", () => {
    const baseTime = 1746835200000000000n;
    // persisted link older
    const persisted = makeLink(baseTime);
    // temp link newer by +1 hour

    const tempNew: UnifiedLinkItem = {
      id: "temp-new",
      title: "Newest",
      linkCreateAt: baseTime + 60n * 60n * 1000000000n,
      state: LinkState.PREVIEW,
      linkType: LinkType.TIP,
    };

    const result = groupAndSortByDate([persisted, tempNew]);

    expect(result).toHaveLength(1);
    // newest should be first
    expect(result[0].links[0]).toEqual(tempNew);
    expect(result[0].links[1]).toEqual(persisted);
  });

  // empty array case already covered above
});
