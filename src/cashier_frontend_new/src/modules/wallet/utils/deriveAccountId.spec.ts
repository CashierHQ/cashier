import { describe, it, expect } from "vitest";
import { deriveAccountId } from "./deriveAccountId";

describe("deriveAccountId", () => {
  it("should derive accountId from valid principal", () => {
    // Anonymous principal - well-known test case
    const principal = "2vxsx-fae";
    const result = deriveAccountId(principal);

    expect(result.isOk()).toBe(true);
    const accountId = result.unwrap();
    expect(typeof accountId).toBe("string");
    // AccountIdentifier hex is 64 chars (32 bytes)
    expect(accountId).toHaveLength(64);
    // Should be valid hex
    expect(accountId).toMatch(/^[0-9a-f]+$/);
  });

  it("should return consistent accountId for same principal", () => {
    const principal = "2vxsx-fae";
    const result1 = deriveAccountId(principal);
    const result2 = deriveAccountId(principal);

    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    expect(result1.unwrap()).toBe(result2.unwrap());
  });

  it("should return different accountIds for different principals", () => {
    const principal1 =
      "3wkbq-hp6r5-hb7gw-gni7g-e7kab-mcugd-jtyuu-5hcy4-krkx7-a2ltk-qqe";
    const principal2 =
      "uncgt-rut24-e62tj-catlu-i243k-y4bwo-qifeu-azhm3-k6zcs-xizfk-cae";
    const result1 = deriveAccountId(principal1);
    const result2 = deriveAccountId(principal2);

    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    expect(result1.unwrap()).not.toBe(result2.unwrap());
  });

  it("should return Err for invalid principal string", () => {
    const result = deriveAccountId("invalid-principal-string");
    expect(result.isErr()).toBe(true);
  });

  it("should return Err for empty string", () => {
    const result = deriveAccountId("");
    expect(result.isErr()).toBe(true);
  });

  it("should handle real-world principal format", () => {
    // Valid IC principal format (example)
    const principal = "rrkah-fqaaa-aaaaa-aaaaq-cai";
    const result = deriveAccountId(principal);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toHaveLength(64);
  });
});
