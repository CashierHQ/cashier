import { describe, it, expect } from "vitest";
import { Principal } from "@icp-sdk/core/principal";
import Asset from "$modules/links/types/asset";

describe("Asset.IC", () => {
  it("constructs an IC asset", () => {
    const p = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
    const asset = Asset.IC(p);

    expect(asset.chain).toBe("IC");
    expect(asset.address.toText()).toBe(p.toText());
  });
});
