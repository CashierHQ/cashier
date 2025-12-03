import { describe, it, expect } from "vitest";
import { getTokenLogo } from "./getTokenLogo";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";

describe("getTokenLogo", () => {
  it("should return ICP logo for ICP ledger canister ID", () => {
    const logo = getTokenLogo(ICP_LEDGER_CANISTER_ID);
    expect(logo).toBe("/icpLogo.png");
  });

  it("should return icexplorer URL for other token addresses", () => {
    const otherTokenAddress = "ryjl3-tyaaa-aaaaa-aaaba-cai";
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
