// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";

import { tempLinkService } from "./tempLinkService";
import TempLink from "../types/tempLink";
import { CreateLinkData, CreateLinkAsset } from "../types/createLinkData";
import { LinkState } from "../types/link/linkState";
import { LinkType } from "../types/link/linkType";
import { CURRENT_CREATING_LINK_ID_KEY } from "$modules/shared/constants";

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

  it("update modifies an existing temp link", () => {
    const t = makeTempLink("update-test", 50n);
    tempLinkService.create("update-test", t, "owner3");

    // Verify initial state
    let links = tempLinkService.get("owner3");
    expect(links).toHaveLength(1);
    expect(links[0].state).toBe(LinkState.CREATE_LINK);

    // Update the state
    tempLinkService.update(
      "update-test",
      { state: LinkState.PREVIEW },
      "owner3",
    );

    // Verify state was updated
    links = tempLinkService.get("owner3");
    expect(links).toHaveLength(1);
    expect(links[0].state).toBe(LinkState.PREVIEW);
    expect(String(links[0].id)).toBe("update-test");
  });

  it("update modifies createLinkData", () => {
    const t = makeTempLink("data-test", 60n);
    tempLinkService.create("data-test", t, "owner4");

    // Create new link data with different values
    const newCreateLinkData = new CreateLinkData({
      title: "Updated Title",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("bbbbb-bb", 2n)],
      maxUse: 5,
    });

    // Update the createLinkData
    tempLinkService.update(
      "data-test",
      { createLinkData: newCreateLinkData },
      "owner4",
    );

    // Verify createLinkData was updated
    const links = tempLinkService.get("owner4");
    expect(links).toHaveLength(1);
    expect(links[0].createLinkData.title).toBe("Updated Title");
    expect(links[0].createLinkData.maxUse).toBe(5);
  });

  it("update does nothing if link id not found", () => {
    const t = makeTempLink("exists", 70n);
    tempLinkService.create("exists", t, "owner5");

    // Try to update non-existent link
    tempLinkService.update(
      "non-existent",
      { state: LinkState.ACTIVE },
      "owner5",
    );

    // Verify original link is unchanged
    const links = tempLinkService.get("owner5");
    expect(links).toHaveLength(1);
    expect(String(links[0].id)).toBe("exists");
    expect(links[0].state).toBe(LinkState.CREATE_LINK);
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

  it("setCurrentCreateLink sets the current link ID", () => {
    tempLinkService.setCurrentCreateLink("new-id");
    expect(localStorage.getItem(CURRENT_CREATING_LINK_ID_KEY)).toBe("new-id");
  });

  it("getCurrentCreateLink returns undefined when no current link is set", () => {
    const result = tempLinkService.getCurrentCreateLink("owner");
    expect(result).toBeUndefined();
  });
});
