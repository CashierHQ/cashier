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
    expect(input.link_use_action_max_count).toEqual(BigInt(1));
  });

  it("converts AIRDROP CreateLinkData into CreateLinkInput Ok result", () => {
    // Arrange
    const airdrop: CreateLinkAsset = new CreateLinkAsset("aaaaa-aa", 100n);
    const data = new CreateLinkData({
      title: "My airdrop",
      linkType: LinkType.AIRDROP,
      assets: [airdrop],
      maxUse: 5,
    });

    // Act
    const res = CreateLinkDataMapper.toCreateLinkInput(data);

    // Assert
    const input = res.unwrap();
    expect(input.title).toEqual("My airdrop");
    expect(input.asset_info).toHaveLength(1);
    expect(input.asset_info[0].label).toEqual("SEND_AIRDROP_ASSET");
    expect(input.asset_info[0].amount_per_link_use_action).toEqual(BigInt(100));
    expect(input.link_use_action_max_count).toEqual(BigInt(5));
  });

  it("converts TOKEN_BASKET CreateLinkData into CreateLinkInput Ok result", () => {
    // Arrange
    const asset1: CreateLinkAsset = new CreateLinkAsset("aaaaa-aa", 100n);
    const asset2: CreateLinkAsset = new CreateLinkAsset(
      "ryjl3-tyaaa-aaaaa-aaaba-cai",
      200n,
    );
    const data = new CreateLinkData({
      title: "My token basket",
      linkType: LinkType.TOKEN_BASKET,
      assets: [asset1, asset2],
      maxUse: 1,
    });

    // Act
    const res = CreateLinkDataMapper.toCreateLinkInput(data);

    // Assert
    const input = res.unwrap();
    expect(input.title).toEqual("My token basket");
    expect(input.asset_info).toHaveLength(2);
    expect(input.asset_info[0].label).toEqual(
      "SEND_TOKEN_BASKET_ASSET_aaaaa-aa",
    );
    expect(input.asset_info[0].amount_per_link_use_action).toEqual(BigInt(100));
    expect(input.asset_info[1].label).toEqual(
      "SEND_TOKEN_BASKET_ASSET_ryjl3-tyaaa-aaaaa-aaaba-cai",
    );
    expect(input.asset_info[1].amount_per_link_use_action).toEqual(BigInt(200));
    expect(input.link_use_action_max_count).toEqual(BigInt(1));
  });

  it("returns error for unsupported link types", () => {
    // Arrange
    const asset: CreateLinkAsset = new CreateLinkAsset("aaaaa-aa", 42n);
    const data = new CreateLinkData({
      title: "My link",
      linkType: LinkType.RECEIVE_PAYMENT,
      assets: [asset],
      maxUse: 1,
    });

    // Act
    const res = CreateLinkDataMapper.toCreateLinkInput(data);

    // Assert
    expect(res.isErr()).toBe(true);
    expect(res.unwrapErr().message).toContain(
      "Only Tip, Airdrop, and Token Basket link types are supported currently",
    );
  });
});
