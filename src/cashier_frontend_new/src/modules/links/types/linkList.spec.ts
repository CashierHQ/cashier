import { describe, it, expect } from "vitest";
import { UnifiedLinkItemMapper } from "./linkList";
import { Link } from "./link/link";
import TempLink from "./tempLink";
import { LinkType } from "./link/linkType";
import { LinkState } from "./link/linkState";
import {
  CreateLinkData,
  CreateLinkAsset,
} from "$modules/creationLink/types/createLinkData";
import { Principal } from "@dfinity/principal";

describe("UnifiedLinkItemMapper", () => {
  it("maps from real Link instance", () => {
    const link = new Link(
      "link-1",
      "My Link",
      Principal.fromText("aaaaa-aa"),
      [],
      LinkType.TIP,
      BigInt(1),
      LinkState.ACTIVE,
      BigInt(1),
      BigInt(0),
    );

    const mapped = UnifiedLinkItemMapper.fromLink(link);

    expect(mapped).toEqual({
      id: "link-1",
      title: "My Link",
      state: LinkState.ACTIVE,
      linkType: LinkType.TIP,
    });
  });

  it("maps from real TempLink instance with title", () => {
    const createData = new CreateLinkData({
      title: "Temp Title",
      linkType: LinkType.TIP,
      assets: [] as CreateLinkAsset[],
      maxUse: 1,
    });

    const tempLink = new TempLink(
      "t-1",
      BigInt(1),
      LinkState.CREATE_LINK,
      createData,
    );

    const mapped = UnifiedLinkItemMapper.fromTempLink(tempLink);

    console.log(mapped);

    expect(mapped).toEqual({
      id: "t-1",
      title: "Temp Title",
      state: LinkState.CREATE_LINK,
      linkType: LinkType.TIP,
    });
  });

  it("maps from real TempLink instance without title uses fallback", () => {
    // CreateLinkData requires a title string; use an empty string to trigger the fallback in the mapper
    const createData = new CreateLinkData({
      title: "",
      linkType: LinkType.TIP,
      assets: [] as CreateLinkAsset[],
      maxUse: 1,
    });

    const tempLink = new TempLink(
      "t-2",
      BigInt(2),
      LinkState.CREATE_LINK,
      createData,
    );

    const mapped = UnifiedLinkItemMapper.fromTempLink(tempLink);

    expect(mapped).toEqual({
      id: "t-2",
      title: "No title",
      state: LinkState.CREATE_LINK,
      linkType: LinkType.TIP,
    });
  });
});
