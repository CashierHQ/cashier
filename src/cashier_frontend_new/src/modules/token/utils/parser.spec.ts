import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import * as icrcLedger from "$lib/generated/icrc_ledger/icrc_ledger.did";
import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";
import {
  parseICPTransferResultError,
  parseIcrcTransferResultError,
  parseListTokens,
} from "./parser";

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
      },
    ]);
  });
});

describe("parseIcrcTransferResultError", () => {
  it("should parse GenericError correctly", () => {
    // Arrange
    const error: icrcLedger.TransferError = {
      GenericError: {
        message: "A generic error occurred",
        error_code: BigInt(123),
      },
    };

    // Act
    const result = parseIcrcTransferResultError(error);

    // Assert
    expect(result).toEqual(
      new Error("Transfer failed: A generic error occurred"),
    );
  });

  it("should parse InsufficientFunds correctly", () => {
    // Arrange
    const error: icrcLedger.TransferError = {
      InsufficientFunds: {
        balance: BigInt(50),
      },
    };

    // Act
    const result = parseIcrcTransferResultError(error);

    // Assert
    expect(result).toEqual(new Error("Transfer failed: Insufficient funds"));
  });

  it("should handle unknown error types", () => {
    // Arrange
    const error: icrcLedger.TransferError = {
      TemporarilyUnavailable: null,
    };

    // Act
    const result = parseIcrcTransferResultError(error);

    // Assert
    expect(result).toEqual(new Error("Transfer failed: Unknown error"));
  });
});

describe("parseICPTransferResultError", () => {
  it("should parse InsufficientFunds correctly", () => {
    // Arrange
    const error: icpLedger.TransferError = {
      InsufficientFunds: {
        balance: { e8s: BigInt(50) },
      },
    };

    // Act
    const result = parseICPTransferResultError(error);

    // Assert
    expect(result).toEqual(new Error("Transfer failed: Insufficient funds"));
  });

  it("should handle unknown error types", () => {
    // Arrange
    const error: icpLedger.TransferError = {
      BadFee: {
        expected_fee: { e8s: BigInt(100) },
      },
    };

    // Act
    const result = parseICPTransferResultError(error);

    // Assert
    expect(result).toEqual(new Error("Transfer failed: Unknown error"));
  });
});
