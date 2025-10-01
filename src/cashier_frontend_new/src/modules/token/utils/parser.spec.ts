import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";
import { parseListTokens } from "./parser";

describe("parseListTokens", () => {
  it("should throw an error for Err response", () => {
    // Arrange
    const response: tokenStorage.Result_5 = {
      Err: "Some error occurred",
    };

    // Act & Assert
    expect(() => parseListTokens(response)).toThrow("Some error occurred");
  });

  it("should return an empty array for empty response", () => {
    // Arrange
    const response: tokenStorage.Result_5 = {
      Ok: {
        need_update_version: false,
        perference: [],
        tokens: [],
      },
    };

    // Act
    const result = parseListTokens(response);

    // Assert
    expect(result).toEqual([]);
  });

  it("should parse the token response correctly", () => {
    // Arrange
    const mockPrincipal = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
    const response: tokenStorage.Result_5 = {
      Ok: {
        need_update_version: false,
        perference: [],
        tokens: [
          {
            id: { IC: { ledger_id: mockPrincipal } },
            name: "Internet Computer",
            symbol: "ICP",
            decimals: 8,
            balance: [BigInt(100000000)],
            enabled: true,
            chain: { IC: null },
            string_id: `IC:${mockPrincipal.toText()}`,
            details: {
              IC: {
                fee: 0n,
                ledger_id: mockPrincipal,
                index_id: [],
              },
            },
          },
        ],
      },
    };

    // Act
    const result = parseListTokens(response);

    // Assert
    expect(result).toEqual([
      {
        address: mockPrincipal.toText(),
        name: "Internet Computer",
        symbol: "ICP",
        decimals: 8,
      },
    ]);
  });
});
