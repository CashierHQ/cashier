import { describe, expect, it } from "vitest";
import { CreateLinkData, type TipLink } from "./createLinkData";
import { LinkType } from "./linkType";

describe("CreateLinkData.toCreateLinkInput", () => {
  it("converts TIP CreateLinkData into CreateLinkInput Ok result", () => {
    // Arrange
    const tip: TipLink = { asset: "aaaaa-aa", useAmount: 42 };
    const data = new CreateLinkData({
      title: "My tip",
      linkType: LinkType.TIP,
      tipLink: tip,
    });

    // Act
    const res = data.toCreateLinkInput();

    // Assert
    const input = res.unwrap();
    expect(input.title).toEqual("My tip");
    expect(input.asset_info).toHaveLength(1);
    expect(input.asset_info[0].label).toEqual("SEND_TIP_ASSET");
    expect(input.asset_info[0].amount_per_link_use_action).toEqual(BigInt(42));
  });

  it("returns Err when TIP link data missing", () => {
    // Arrange
    const data = new CreateLinkData({
      title: "No tip",
      linkType: LinkType.TIP,
    });

    // Act
    const res = data.toCreateLinkInput();

    // Assert
    const err = res.unwrapErr();
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Tip link data is missing");
  });
});
