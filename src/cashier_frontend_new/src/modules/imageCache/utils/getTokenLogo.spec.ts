import { describe, it, expect } from "vitest";
import {
  getResolvedTokenLogo,
  getTokenLogo,
  normalizeTokenMetadataIcon,
} from "$modules/imageCache/utils/getTokenLogo";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";

describe("getTokenLogo", () => {
  it("should return ICP logo for ICP ledger canister ID", () => {
    const logo = getTokenLogo(ICP_LEDGER_CANISTER_ID);
    expect(logo).toBe("/icpLogo.png");
  });

  it("should return icexplorer URL for other token addresses", () => {
    const otherTokenAddress = "xevnm-gaaaa-aaaar-qafnq-cai";
    const logo = getTokenLogo(otherTokenAddress);
    expect(logo).toBe(`https://api.icexplorer.io/images/${otherTokenAddress}`);
  });

  it("should return icexplorer URL for different token addresses", () => {
    const tokenAddress1 = "token-address-1";
    const tokenAddress2 = "token-address-2";

    const logo1 = getTokenLogo(tokenAddress1);
    const logo2 = getTokenLogo(tokenAddress2);

    expect(logo1).toBe(`https://api.icexplorer.io/images/${tokenAddress1}`);
    expect(logo2).toBe(`https://api.icexplorer.io/images/${tokenAddress2}`);
  });

  it("should handle empty string address", () => {
    const logo = getTokenLogo("");
    expect(logo).toBe("https://api.icexplorer.io/images/");
  });
});

describe("normalizeTokenMetadataIcon", () => {
  it("should return absolute http URLs", () => {
    expect(normalizeTokenMetadataIcon("https://example.com/token.png")).toBe(
      "https://example.com/token.png",
    );
  });

  it("should return data and blob URLs", () => {
    expect(normalizeTokenMetadataIcon("data:image/png;base64,test")).toBe(
      "data:image/png;base64,test",
    );
    expect(normalizeTokenMetadataIcon("blob:https://example.com/123")).toBe(
      "blob:https://example.com/123",
    );
  });

  it("should normalize protocol-relative URLs", () => {
    expect(normalizeTokenMetadataIcon("//example.com/token.png")).toBe(
      "https://example.com/token.png",
    );
  });

  it("should ignore non-URL metadata values", () => {
    expect(normalizeTokenMetadataIcon("61b71885.webp")).toBeUndefined();
    expect(normalizeTokenMetadataIcon("TTT")).toBeUndefined();
    expect(normalizeTokenMetadataIcon("871652:697")).toBeUndefined();
    expect(normalizeTokenMetadataIcon("")).toBeUndefined();
  });
});

describe("getResolvedTokenLogo", () => {
  it("should prefer valid metadata icons", () => {
    const logo = getResolvedTokenLogo({
      address: "token-address",
      runeInfo: {
        icon: "https://example.com/rune.png",
      },
    });

    expect(logo).toBe("https://example.com/rune.png");
  });

  it("should fall back to token logo when metadata icon is not a URL", () => {
    const logo = getResolvedTokenLogo({
      address: "token-address",
      runeInfo: {
        icon: "TTT",
      },
    });

    expect(logo).toBe("https://api.icexplorer.io/images/token-address");
  });
});
