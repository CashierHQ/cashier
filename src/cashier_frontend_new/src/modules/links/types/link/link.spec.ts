import { describe, it, expect } from "vitest";
import * as devalue from "devalue";
import { Principal } from "@dfinity/principal";
import { Link, LinkMapper, type SerializedLink } from "./link";
import { Asset, AssetInfo } from "./asset";
import { LinkType } from "./linkType";
import { LinkState } from "./linkState";

function makeSampleLink(id = "link-1", title = "Test Tip Link") {
  const creator = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  const assetAddress = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  const assetInfo = new AssetInfo(
    Asset.IC(assetAddress),
    BigInt(5000000),
    "SEND_TIP_ASSET",
  );

  return new Link(
    id,
    title,
    creator,
    [assetInfo],
    LinkType.TIP,
    BigInt(Date.now()),
    LinkState.ACTIVE,
    BigInt(1),
    BigInt(0),
  );
}

describe("LinkMapper serde", () => {
  it("serializes and deserializes Link via LinkMapper.serde", () => {
    const link = makeSampleLink();

    // serialize
    const serialized = LinkMapper.serde.serialize["Link"](
      link as unknown,
    ) as SerializedLink;
    expect(serialized).toBeTruthy();
    expect(serialized.id).toBe(link.id);
    expect(serialized.title).toBe(link.title);
    expect(serialized.creator).toBe(link.creator.toText());

    // deserialize
    const deserialized = LinkMapper.serde.deserialize["Link"](
      serialized,
    ) as Link;
    expect(deserialized).toBeInstanceOf(Link);
    expect(deserialized.id).toBe(link.id);
    expect(deserialized.title).toBe(link.title);
    expect(deserialized.creator.toText()).toBe(link.creator.toText());
    expect(deserialized.asset_info).toHaveLength(1);
    expect(deserialized.asset_info[0].label).toBe(link.asset_info[0].label);
    expect(deserialized.asset_info[0].amount_per_link_use_action).toBe(
      link.asset_info[0].amount_per_link_use_action,
    );
    expect(deserialized.asset_info[0].asset.chain).toBe(
      link.asset_info[0].asset.chain,
    );
    expect(deserialized.asset_info[0].asset.address?.toText()).toBe(
      link.asset_info[0].asset.address?.toText(),
    );
    expect(deserialized.link_type).toBe(link.link_type);
    expect(deserialized.state).toBe(link.state);
  });

  it("stringify and parse a Link using devalue and LinkMapper.serde", () => {
    const link = makeSampleLink("link-2", "Devalue Roundtrip");

    const serialized = devalue.stringify(
      link as unknown,
      LinkMapper.serde.serialize,
    );
    expect(typeof serialized).toBe("string");

    const parsed = devalue.parse(
      serialized,
      LinkMapper.serde.deserialize,
    ) as Link;
    expect(parsed).toBeInstanceOf(Link);
    expect(parsed.id).toBe(link.id);
    expect(parsed.title).toBe(link.title);
    expect(parsed.creator.toText()).toBe(link.creator.toText());
    expect(parsed.asset_info).toHaveLength(1);
    expect(parsed.asset_info[0].label).toBe(link.asset_info[0].label);
    expect(parsed.asset_info[0].amount_per_link_use_action).toBe(
      link.asset_info[0].amount_per_link_use_action,
    );
    expect(parsed.asset_info[0].asset.chain).toBe(
      link.asset_info[0].asset.chain,
    );
    expect(parsed.asset_info[0].asset.address?.toText()).toBe(
      link.asset_info[0].asset.address?.toText(),
    );
    expect(parsed.link_type).toBe(link.link_type);
    expect(parsed.state).toBe(link.state);
  });
});
