import { describe, expect, it, vi } from "vitest";
import { Principal } from "@dfinity/principal";
import {
  principalToAccountId,
  encodeAccountID,
  decodeAccountID,
} from "./icp-account-id";

// Known test principal and its corresponding account ID
// Using aaaaa-aa (management canister) as a stable test case
const TEST_PRINCIPAL_TEXT = "aaaaa-aa";
const TEST_PRINCIPAL = Principal.fromText(TEST_PRINCIPAL_TEXT);

describe("principalToAccountId", () => {
  it("should convert valid principal text to account ID", () => {
    const result = principalToAccountId(TEST_PRINCIPAL_TEXT);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
    expect(result).toHaveLength(64); // Account IDs are 32 bytes = 64 hex chars
  });

  it("should return consistent results for same principal", () => {
    const result1 = principalToAccountId(TEST_PRINCIPAL_TEXT);
    const result2 = principalToAccountId(TEST_PRINCIPAL_TEXT);
    expect(result1).toBe(result2);
  });

  it("should return different account IDs for different principals", () => {
    const principal1 = "aaaaa-aa";
    const principal2 = "rrkah-fqaaa-aaaaa-aaaaq-cai"; // ICP ledger canister
    const result1 = principalToAccountId(principal1);
    const result2 = principalToAccountId(principal2);
    expect(result1).not.toBe(result2);
  });

  it("should return null for invalid principal text", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = principalToAccountId("invalid-principal-text");
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should return null for empty string", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = principalToAccountId("");
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe("encodeAccountID", () => {
  it("should convert valid Principal object to account ID", () => {
    const result = encodeAccountID(TEST_PRINCIPAL);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
    expect(result).toHaveLength(64);
  });

  it("should return consistent results for same Principal", () => {
    const result1 = encodeAccountID(TEST_PRINCIPAL);
    const result2 = encodeAccountID(TEST_PRINCIPAL);
    expect(result1).toBe(result2);
  });

  it("should match principalToAccountId output for same principal", () => {
    const fromText = principalToAccountId(TEST_PRINCIPAL_TEXT);
    const fromObject = encodeAccountID(TEST_PRINCIPAL);
    expect(fromText).toBe(fromObject);
  });

  it("should return different account IDs for different Principals", () => {
    const principal1 = Principal.fromText("aaaaa-aa");
    const principal2 = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
    const result1 = encodeAccountID(principal1);
    const result2 = encodeAccountID(principal2);
    expect(result1).not.toBe(result2);
  });
});

describe("decodeAccountID", () => {
  it("should decode valid account ID hex to Uint8Array", () => {
    const accountIdHex = principalToAccountId(TEST_PRINCIPAL_TEXT)!;
    const result = decodeAccountID(accountIdHex);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toHaveLength(32); // Account IDs are 32 bytes
  });

  it("should return consistent results for same account ID", () => {
    const accountIdHex = principalToAccountId(TEST_PRINCIPAL_TEXT)!;
    const result1 = decodeAccountID(accountIdHex);
    const result2 = decodeAccountID(accountIdHex);
    expect(result1).toEqual(result2);
  });

  it("should throw error for invalid hex string", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => decodeAccountID("invalid-hex")).toThrow(
      "Invalid ICP account ID",
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should throw error for empty string", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => decodeAccountID("")).toThrow("Invalid ICP account ID");
    consoleSpy.mockRestore();
  });

  it("should throw error for wrong length hex", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => decodeAccountID("abc123")).toThrow("Invalid ICP account ID");
    consoleSpy.mockRestore();
  });
});
