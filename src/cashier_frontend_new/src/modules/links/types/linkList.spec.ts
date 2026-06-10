import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";
import { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkType } from "$modules/links/types/link/linkType";
import { UnifiedLinkItemMapper } from "$modules/links/types/linkList";
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type Link as SharedLink,
} from "$shared";

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
      linkCreateAt: BigInt(1),
      state: LinkState.ACTIVE,
      linkType: LinkType.TIP,
      isCreated: true,
    });
  });

  it("maps from shared draft link", () => {
    const draftLink: SharedLink = {
      id: "draft-1",
      title: "Draft Title",
      link_type: SharedLinkType.SendTip,
      link_state: SharedLinkState.Preview,
      creator: Principal.fromText("aaaaa-aa"),
      asset_info: [],
      max_use: 1n,
      use_count: 0n,
      created_at: 2n,
    };

    const mapped = UnifiedLinkItemMapper.fromDraftLink(draftLink);

    expect(mapped).toEqual({
      id: "draft-1",
      title: "Draft Title",
      linkCreateAt: BigInt(2),
      state: LinkState.PREVIEW,
      linkType: LinkType.TIP,
      isCreated: false,
    });
  });
});
