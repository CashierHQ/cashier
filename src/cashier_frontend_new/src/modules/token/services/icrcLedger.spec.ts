import * as icrcLedger from "$lib/generated/icrc_ledger/icrc_ledger.did";
import { describe, expect, it } from "vitest";
import { parseIcrcTransferResultError } from "./icrcLedger";

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
