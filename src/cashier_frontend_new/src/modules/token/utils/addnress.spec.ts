import { describe, expect, it } from "vitest";
import { shortenAddress } from "./address";

describe("shortenAddress", () => {
  it("should return the original address if length is 16 or less", () => {
    const shortAddress = "abc123def456";
    expect(shortenAddress(shortAddress)).toBe("abc123def456");
  });

  it("should return the original address if length is exactly 16", () => {
    const address = "1234567890123456";
    expect(shortenAddress(address)).toBe("1234567890123456");
  });

  it("should shorten address longer than 16 characters", () => {
    const longAddress = "rrkah-fqaaa-aaaaa-aaaaq-cai";
    const result = shortenAddress(longAddress);

    expect(result).toBe("rrkah-fq.....aq-cai");
  });

  it("should correctly format a typical canister ID", () => {
    const canisterId = "mxzaz-hqaaa-aaaar-qaada-cai";
    const result = shortenAddress(canisterId);

    expect(result).toBe("mxzaz-hq.....da-cai");
  });

  it("should handle very long addresses", () => {
    const veryLongAddress = "0x1234567890abcdef1234567890abcdef1234567890";
    const result = shortenAddress(veryLongAddress);

    expect(result).toBe("0x123456.....bcdef0");
    expect(result.length).toBe(20); // 8 + 5 dots + 6 + 1 (0x prefix counted)
  });

  it("should handle empty string", () => {
    const emptyAddress = "";
    expect(shortenAddress(emptyAddress)).toBe("");
  });

  it("should preserve first 8 and last 6 characters", () => {
    const address = "abcdefghijklmnopqrstuvwxyz";
    const result = shortenAddress(address);

    expect(result.startsWith("abcdefgh")).toBe(true);
    expect(result.endsWith("uvwxyz")).toBe(true);
    expect(result).toBe("abcdefgh.....uvwxyz");
  });
});
