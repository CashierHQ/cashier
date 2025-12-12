import { describe, expect, it } from "vitest";
import {
  CreateLinkAsset,
  CreateLinkData,
  CreateLinkDataMapper,
} from "./createLinkData";
import { LinkType } from "$modules/links/types/link/linkType";

describe("CreateLinkData.toCreateLinkInput", () => {
  it("converts TIP CreateLinkData into CreateLinkInput Ok result", () => {
    // Arrange
    const tip: CreateLinkAsset = new CreateLinkAsset("aaaaa-aa", 42n);
    const data = new CreateLinkData({
      title: "My tip",
      linkType: LinkType.TIP,
      assets: [tip],
      maxUse: 1,
    });

    // Act
    const res = CreateLinkDataMapper.toCreateLinkInput(data);

    // Assert
    const input = res.unwrap();
    expect(input.title).toEqual("My tip");
    expect(input.asset_info).toHaveLength(1);
    expect(input.asset_info[0].label).toEqual("SEND_TIP_ASSET");
    expect(input.asset_info[0].amount_per_link_use_action).toEqual(BigInt(42));
  });
});
