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
                fee: 10000n,
                ledger_id: mockPrincipal,
                index_id: [],
              },
            },
            is_default: true,
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
        enabled: true,
        fee: 10000n,
        is_default: true,
        indexId: undefined,
      },
    ]);
  });

  it("should parse token with indexId correctly", () => {
    // Arrange
    const mockLedgerPrincipal = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");
    const mockIndexPrincipal = Principal.fromText("qhbym-qaaaa-aaaaa-aaafq-cai");
    const response: tokenStorage.Result_5 = {
      Ok: {
        need_update_version: false,
        perference: [],
        tokens: [
          {
            id: { IC: { ledger_id: mockLedgerPrincipal } },
            name: "ckBTC",
            symbol: "ckBTC",
            decimals: 8,
            balance: [BigInt(50000000)],
            enabled: true,
            chain: { IC: null },
            string_id: `IC:${mockLedgerPrincipal.toText()}`,
            details: {
              IC: {
                fee: 10n,
                ledger_id: mockLedgerPrincipal,
                index_id: [mockIndexPrincipal],
              },
            },
            is_default: false,
          },
        ],
      },
    };

    // Act
    const result = parseListTokens(response);

    // Assert
    expect(result).toEqual([
      {
        address: mockLedgerPrincipal.toText(),
        name: "ckBTC",
        symbol: "ckBTC",
        decimals: 8,
        enabled: true,
        fee: 10n,
        is_default: false,
        indexId: mockIndexPrincipal.toText(),
      },
    ]);
  });
});
