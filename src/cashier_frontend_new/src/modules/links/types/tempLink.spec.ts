import { describe, it, expect } from "vitest";
import TempLink, { TempLinkMapper, type SerializedTempLink } from "./tempLink";
import { LinkState } from "./link/linkState";
import { LinkType } from "./link/linkType";
import * as devalue from "devalue";
import {
  CreateLinkAsset,
  CreateLinkData,
} from "$modules/creationLink/types/createLinkData";

describe("TempLinkMapper serde", () => {
  it("should serialize and deserialize a TempLink correctly", () => {
    // Arrange: create a sample TempLink
    const asset = new CreateLinkAsset("aaaaa-aa", 10n);
    const createData = new CreateLinkData({
      title: "My Link",
      linkType: LinkType.TIP,
      assets: [asset],
      maxUse: 5,
    });

    const original = new TempLink(
      "link-1",
      123456789n,
      LinkState.CREATE_LINK,
      createData,
    );

    const serialized = TempLinkMapper.serde.serialize.TempLink(
      original,
    ) as unknown as SerializedTempLink;

    // The serializer returns an object when passed a TempLink instance
    expect(serialized).toBeTruthy();
    // Basic shape checks
    expect(serialized.id).toBe("link-1");
    expect(serialized.create_at).toBe(123456789n);
    expect(serialized.state).toBe(LinkState.CREATE_LINK);
    expect(serialized.createLinkData.title).toBe("My Link");
    expect(Array.isArray(serialized.createLinkData.assets)).toBe(true);

    // Act: deserialize back to TempLink instance
    const deserializedAny = TempLinkMapper.serde.deserialize.TempLink(
      serialized,
    ) as unknown;

    // Assert: we get a TempLink instance with same values
    expect(deserializedAny).toBeInstanceOf(TempLink);
    const deserialized = deserializedAny as TempLink;
    expect(deserialized.id).toBe(original.id);
    expect(deserialized.create_at).toBe(original.create_at);
    expect(deserialized.state).toBe(original.state);
    expect(deserialized.createLinkData.title).toBe(
      original.createLinkData.title,
    );
    expect(deserialized.createLinkData.linkType).toBe(
      original.createLinkData.linkType,
    );
    expect(deserialized.createLinkData.maxUse).toBe(
      original.createLinkData.maxUse,
    );
    expect(deserialized.createLinkData.assets).toHaveLength(1);
    expect(deserialized.createLinkData.assets?.[0].address).toBe(asset.address);
    expect(deserialized.createLinkData.assets?.[0].useAmount).toBe(
      asset.useAmount,
    );
  });

  it("should handle empty assets array in CreateLinkData", () => {
    // Arrange: Create a CreateLinkData with empty assets
    const createDataEmpty = new CreateLinkData({
      title: "Empty Assets",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 1,
    });

    const originalEmpty = new TempLink(
      "link-empty",
      111111n,
      LinkState.CREATE_LINK,
      createDataEmpty,
    );

    // Act: serialize
    const serializedEmpty = TempLinkMapper.serde.serialize.TempLink(
      originalEmpty,
    ) as unknown as SerializedTempLink;

    // Assert serialized assets is an empty array
    expect(Array.isArray(serializedEmpty.createLinkData.assets)).toBe(true);
    expect(serializedEmpty.createLinkData.assets).toHaveLength(0);

    // Act: deserialize
    const deserializedAnyEmpty = TempLinkMapper.serde.deserialize.TempLink(
      serializedEmpty,
    ) as unknown;
    expect(deserializedAnyEmpty).toBeInstanceOf(TempLink);
    const deserializedEmpty = deserializedAnyEmpty as TempLink;

    // Assert deserialized CreateLinkData.assets is an empty array
    expect(deserializedEmpty.createLinkData.assets).toBeDefined();
    expect(deserializedEmpty.createLinkData.assets).toHaveLength(0);
  });

  it("should stringify and parse TempLink array with devalue using the mapper", () => {
    const asset = new CreateLinkAsset("zzzzz-aa", 1n);
    const createData = new CreateLinkData({
      title: "Devalue Test",
      linkType: LinkType.TIP,
      assets: [asset],
      maxUse: 2,
    });

    const original = new TempLink(
      "link-devalue",
      222222n,
      LinkState.CREATE_LINK,
      createData,
    );

    // stringify using TempLinkMapper.serialize
    const str = devalue.stringify([original], TempLinkMapper.serde.serialize);
    expect(typeof str).toBe("string");

    // parse back using TempLinkMapper.deserialize
    const parsed = devalue.parse(
      str,
      TempLinkMapper.serde.deserialize,
    ) as TempLink[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    const p = parsed[0];
    expect(p).toBeInstanceOf(TempLink);
    expect(p.id).toBe(original.id);
    expect(p.create_at).toBe(original.create_at);
    expect(p.createLinkData.assets).toHaveLength(1);
    expect(p.createLinkData.assets?.[0].address).toBe(asset.address);
  });

  it("should stringify and parse empty assets array in CreateLinkData", () => {
    const createData = new CreateLinkData({
      title: "Devalue Test",
      linkType: LinkType.TIP,
      assets: [],
      maxUse: 2,
    });

    const original = new TempLink(
      "link-devalue",
      222222n,
      LinkState.CREATE_LINK,
      createData,
    );

    // stringify using TempLinkMapper.serialize
    const str = devalue.stringify([original], TempLinkMapper.serde.serialize);
    expect(typeof str).toBe("string");

    // parse back using TempLinkMapper.deserialize
    const parsed = devalue.parse(
      str,
      TempLinkMapper.serde.deserialize,
    ) as TempLink[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    const p = parsed[0];
    expect(p).toBeInstanceOf(TempLink);
    expect(p.id).toBe(original.id);
    expect(p.create_at).toBe(original.create_at);
    expect(p.createLinkData.assets).toHaveLength(0);
  });
});
