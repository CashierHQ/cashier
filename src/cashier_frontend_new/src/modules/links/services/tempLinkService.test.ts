// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";

import tempLinkService from "./tempLinkService";
import TempLink from "../types/tempLink";
import { CreateLinkData, CreateLinkAsset } from "../types/createLinkData";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";

// Use jsdom's localStorage (vitest provides it). Clear before each test.
beforeEach(() => {
  localStorage.clear();
});

function makeTempLink(id: string, time: bigint) {
  const createLinkData = new CreateLinkData({
    title: "",
    linkType: LinkType.TIP,
    assets: [new CreateLinkAsset("aaaaa-aa", 1n)],
    maxUse: 1,
  });
  return new TempLink(id, time, LinkState.CREATE_LINK, createLinkData);
}

describe("TempLinkService", () => {
  it("create and get should persist and retrieve temp links (anon)", () => {
    const t = makeTempLink("1", 10n);
    tempLinkService.create("1", t, "anon");

    const all = tempLinkService.get(undefined);
    expect(all).toHaveLength(1);
    expect(String(all[0].id)).toBe("1");
    // ensure localStorage key exists
    expect(localStorage.getItem("tempLinks.anon")).not.toBeNull();
  });

  it("getNewest returns the link with the largest create_at", () => {
    const older = makeTempLink("a", 1n);
    const newer = makeTempLink("b", 100n);
    tempLinkService.create("a", older, "owner1");
    tempLinkService.create("b", newer, "owner1");

    const newest = tempLinkService.getCurrentCreateLink("owner1");
    expect(newest).toBeDefined();
    expect(String(newest!.id)).toBe("b");
  });

  it("delete removes an entry", () => {
    const t = makeTempLink("del", 5n);
    tempLinkService.create("del", t, "owner2");

    let got = tempLinkService.get("owner2");
    expect(got.length).toBe(1);

    tempLinkService.delete("del", "owner2");
    got = tempLinkService.get("owner2");
    expect(got.length).toBe(0);
  });

  it("handles malformed existing storage gracefully when creating", () => {
    // write invalid JSON to the key
    localStorage.setItem("tempLinks.anon", "not-a-valid-devalue");
    const t = makeTempLink("x", 2n);
    // should not throw
    expect(() => tempLinkService.create("x", t, "anon")).not.toThrow();

    const all = tempLinkService.get(undefined);
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});
