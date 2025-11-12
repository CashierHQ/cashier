import { describe, it, expect } from "vitest";
import { groupAndSortByDate } from "./groupAndSortByDate";
import { Link } from "../types/link/link";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { Principal } from "@dfinity/principal";
import { TempLink } from "../types/tempLink";
import { CreateLinkData } from "$modules/creationLink/types/createLinkData";

const makeLink = (create_at: bigint) =>
  new Link(
    "id" + create_at.toString(),
    "title",
    Principal.fromText("aaaaa-aa"),
    [],
    LinkType.TIP,
    create_at,
    LinkState.ACTIVE,
    0n,
    0n,
  );

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

    const result = groupAndSortByDate([link, tempLink]);

    expect(result).toHaveLength(1);
    expect(result[0].links).toHaveLength(2);
    expect(result[0].links).toContain(link);
    expect(result[0].links).toContain(tempLink);
  });

  it("groups temp links and persisted links on different days", () => {
    const day1 = 1746835200000000000n;
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

    const result = groupAndSortByDate([link, tempLink, tempLink2]);

    expect(result).toHaveLength(3);
    expect(result[0].date).toBeGreaterThan(result[1].date);
    expect(result[1].date).toBeGreaterThan(result[2].date);
    expect(result[0].links).toEqual([tempLink2]);
    expect(result[1].links).toEqual([tempLink]);
    expect(result[2].links).toEqual([link]);
  });

  it("handles only temp links", () => {
    const time = 1746835200000000000n;
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

    const result = groupAndSortByDate([tempLink1, tempLink2]);

    expect(result).toHaveLength(1);
    expect(result[0].links).toHaveLength(2);
    expect(result[0].links).toContain(tempLink1);
    expect(result[0].links).toContain(tempLink2);
  });

  it("sorts links within same day by newest first (temp link newest)", () => {
    const baseTime = 1746835200000000000n;
    // persisted link older
    const persisted = makeLink(baseTime);
    // temp link newer by +1 hour
    const tempNew = new TempLink(
      "temp-new",
      baseTime + 60n * 60n * 1000000000n,
      LinkState.PREVIEW,
      new CreateLinkData({
        title: "Newest",
        linkType: LinkType.TIP,
        assets: [],
        maxUse: 1,
      }),
    );

    const result = groupAndSortByDate([persisted, tempNew]);

    expect(result).toHaveLength(1);
    // newest should be first
    expect(result[0].links[0]).toBe(tempNew);
    expect(result[0].links[1]).toBe(persisted);
  });

  it("returns empty array when no links", () => {
    const result = groupAndSortByDate([]);
    expect(result).toEqual([]);
  });
});
