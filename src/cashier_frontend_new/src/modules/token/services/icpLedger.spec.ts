import * as icpLedger from "$lib/generated/icp_ledger_canister/icp_ledger_canister.did";
import { describe, expect, it } from "vitest";
import { parseICPTransferResultError } from "./icpLedger";

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
