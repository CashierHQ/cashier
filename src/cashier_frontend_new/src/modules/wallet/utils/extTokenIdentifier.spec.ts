import { describe, expect, it } from "vitest";
import {
  buildExtThumbnailUrl,
  encodeExtTokenIdentifier,
} from "$modules/wallet/utils/extTokenIdentifier";

describe("encodeExtTokenIdentifier", () => {
  it("should match a known real-world EXT token identifier", () => {
    // Verified against a live canister during investigation: this canister id + index
    // combination is confirmed (via direct HTTP request) to serve a real image.
    const result = encodeExtTokenIdentifier("kembn-6qaaa-aaaag-qc7ga-cai", 239);

    expect(result).toBe("4el4t-lykor-uwiaa-aaaaa-buaxz-qaqca-aaadx-q");
  });

  it("should encode different indices to different identifiers", () => {
    const canisterId = "kembn-6qaaa-aaaag-qc7ga-cai";

    expect(encodeExtTokenIdentifier(canisterId, 0)).not.toBe(
      encodeExtTokenIdentifier(canisterId, 1),
    );
  });
});

describe("buildExtThumbnailUrl", () => {
  it("should build a raw-asset thumbnail URL using the encoded token identifier", () => {
    const url = buildExtThumbnailUrl("kembn-6qaaa-aaaag-qc7ga-cai", 239);

    expect(url).toBe(
      "https://kembn-6qaaa-aaaag-qc7ga-cai.raw.icp0.io/?type=thumbnail&tokenid=4el4t-lykor-uwiaa-aaaaa-buaxz-qaqca-aaadx-q",
    );
  });
});
