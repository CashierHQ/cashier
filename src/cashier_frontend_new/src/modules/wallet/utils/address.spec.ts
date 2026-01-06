import { describe, it, expect } from "vitest";
import { isValidPrincipal, isValidAccountId, shortenAddress } from "./address";
import { Ed25519KeyIdentity } from "@dfinity/identity";

describe("isValidPrincipal", () => {
  it("should return Ok with Principal for valid principal", () => {
    const validPrincipal = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const result = isValidPrincipal(validPrincipal);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().toText()).toBe(validPrincipal);
  });

  it("should return Ok for anonymous principal", () => {
    const anonymousPrincipal = "2vxsx-fae";
    const result = isValidPrincipal(anonymousPrincipal);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().toText()).toBe(anonymousPrincipal);
  });

  it("should return Err for empty string", () => {
    const result = isValidPrincipal("");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Principal address");
  });

  it("should return Err for invalid principal format", () => {
    const result = isValidPrincipal("invalid-principal");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Principal address");
  });

  it("should return Err for random string", () => {
    const result = isValidPrincipal("abc123xyz");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Principal address");
  });

  it("should return Err for account id format (hex string)", () => {
    const accountId =
      "5c66192f65e0bacc2c9e34a0c0eb1ebfe52da1a5b8c11ddfa74e4e4f67e8c6b2";
    const result = isValidPrincipal(accountId);

    expect(result.isErr()).toBe(true);
  });

  it("should return Ok for principal with valid addresses", () => {
    const canisterId = "ghsi2-tqaaa-aaaan-aaaca-cai";
    const randomPid = Ed25519KeyIdentity.generate().getPrincipal().toText();

    const result = isValidPrincipal(canisterId);
    const result2 = isValidPrincipal(randomPid);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().toText()).toBe(canisterId);
    expect(result2.isOk()).toBe(true);
    expect(result2.unwrap().toText()).toBe(randomPid);
  });
});

describe("isValidAccountId", () => {
  it("should return Ok with AccountIdentifier for valid account id", () => {
    // This is the ICP ledger account - a known valid account identifier
    const validAccountId =
      "d3e13d4777e22367532053190b6c6ccf57444a61337e996242b1abfb52cf92c8";
    const result = isValidAccountId(validAccountId);

    expect(result.isOk()).toBe(true);
  });

  it("should return Err for empty string", () => {
    const result = isValidAccountId("");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Account Identifier");
  });

  it("should return Err for invalid hex string", () => {
    const result = isValidAccountId("not-a-hex-string");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Account Identifier");
  });

  it("should return Err for too short hex string", () => {
    const result = isValidAccountId("5c66192f65e0bacc");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Account Identifier");
  });

  it("should return Err for principal format", () => {
    const result = isValidAccountId("ryjl3-tyaaa-aaaaa-aaaba-cai");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("Invalid Account Identifier");
  });

  it("should return Err for invalid checksum", () => {
    const invalidChecksum =
      "0000000000000000000000000000000000000000000000000000000000000000";
    const result = isValidAccountId(invalidChecksum);

    expect(result.isErr()).toBe(true);
  });
});

describe("shortenAddress", () => {
  it("should return full address if 16 chars or less", () => {
    const shortAddress = "abc123";
    expect(shortenAddress(shortAddress)).toBe(shortAddress);
  });

  it("should shorten address longer than 16 chars", () => {
    const longAddress = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const result = shortenAddress(longAddress);

    // First 8 chars + ".....'" + last 6 chars
    expect(result).toBe("ryjl3-ty.....ba-cai");
    expect(result.length).toBe(19);
  });

  it("should handle exactly 16 char address", () => {
    const address = "1234567890123456";
    expect(shortenAddress(address)).toBe(address);
  });

  it("should handle 17 char address", () => {
    const address = "12345678901234567";
    const result = shortenAddress(address);

    // First 8 + ".....'" + last 6
    expect(result).toBe("12345678.....234567");
  });
});
