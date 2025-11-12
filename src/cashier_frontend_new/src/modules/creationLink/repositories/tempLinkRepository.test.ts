// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";

import { tempLinkRepository } from "./tempLinkRepository";
import { CreateLinkData, CreateLinkAsset } from "../types/createLinkData";
import { LinkState } from "$modules/links/types/link/linkState";
import TempLink from "$modules/links/types/tempLink";
import { LinkType } from "$modules/links/types/link/linkType";

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
  it("delete removes an entry", () => {
    const t = makeTempLink("del", 5n);
    tempLinkRepository.create({
      id: "del",
      tempLink: t,
      owner: "owner2",
    });

    let got = tempLinkRepository.get("owner2");
    expect(got.length).toBe(1);

    tempLinkRepository.delete("del", "owner2");
    got = tempLinkRepository.get("owner2");
    expect(got.length).toBe(0);
  });

  it("update modifies an existing temp link", () => {
    const t = makeTempLink("update-test", 50n);
    tempLinkRepository.create({
      id: "update-test",
      tempLink: t,
      owner: "owner3",
    });

    // Verify initial state
    let links = tempLinkRepository.get("owner3");
    expect(links).toHaveLength(1);
    expect(links[0].state).toBe(LinkState.CREATE_LINK);

    // Update the state
    tempLinkRepository.update({
      id: "update-test",
      updateTempLink: { state: LinkState.PREVIEW },
      owner: "owner3",
    });

    // Verify state was updated
    links = tempLinkRepository.get("owner3");
    expect(links).toHaveLength(1);
    expect(links[0].state).toBe(LinkState.PREVIEW);
    expect(String(links[0].id)).toBe("update-test");
  });

  it("update modifies createLinkData", () => {
    const t = makeTempLink("data-test", 60n);
    tempLinkRepository.create({
      id: "data-test",
      tempLink: t,
      owner: "owner4",
    });

    // Create new link data with different values
    const newCreateLinkData = new CreateLinkData({
      title: "Updated Title",
      linkType: LinkType.TIP,
      assets: [new CreateLinkAsset("bbbbb-bb", 2n)],
      maxUse: 5,
    });

    // Update the createLinkData
    tempLinkRepository.update({
      id: "data-test",
      updateTempLink: { createLinkData: newCreateLinkData },
      owner: "owner4",
    });

    // Verify createLinkData was updated
    const links = tempLinkRepository.get("owner4");
    expect(links).toHaveLength(1);
    expect(links[0].createLinkData.title).toBe("Updated Title");
    expect(links[0].createLinkData.maxUse).toBe(5);
  });

  it("update does nothing if link id not found", () => {
    const t = makeTempLink("exists", 70n);
    tempLinkRepository.create({
      id: "exists",
      tempLink: t,
      owner: "owner5",
    });

    // Try to update non-existent link
    tempLinkRepository.update({
      id: "non-existent",
      updateTempLink: { state: LinkState.ACTIVE },
      owner: "owner5",
    });

    // Verify original link is unchanged
    const links = tempLinkRepository.get("owner5");
    expect(links).toHaveLength(1);
    expect(String(links[0].id)).toBe("exists");
    expect(links[0].state).toBe(LinkState.CREATE_LINK);
  });
});
