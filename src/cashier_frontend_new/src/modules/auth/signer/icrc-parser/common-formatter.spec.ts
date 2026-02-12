import { describe, it, expect } from "vitest";
import { formatIcrcError } from "./common-formatter";
import type { IcrcError } from "./common-types";

describe("formatIcrcError", () => {
  it("returns variant name for null details", () => {
    const err: IcrcError = { variant: "TooOld", details: null };
    expect(formatIcrcError(err)).toBe("TooOld");
  });

  it("formats BadFee", () => {
    const err: IcrcError = {
      variant: "BadFee",
      details: { expected_fee: 10000n },
    };
    expect(formatIcrcError(err)).toBe("BadFee: expected_fee=10000");
  });

  it("formats BadBurn", () => {
    const err: IcrcError = {
      variant: "BadBurn",
      details: { min_burn_amount: 500n },
    };
    expect(formatIcrcError(err)).toBe("BadBurn: min_burn_amount=500");
  });

  it("formats InsufficientFunds", () => {
    const err: IcrcError = {
      variant: "InsufficientFunds",
      details: { balance: 100n },
    };
    expect(formatIcrcError(err)).toBe("InsufficientFunds: balance=100");
  });

  it("formats InsufficientAllowance", () => {
    const err: IcrcError = {
      variant: "InsufficientAllowance",
      details: { allowance: 50n },
    };
    expect(formatIcrcError(err)).toBe("InsufficientAllowance: allowance=50");
  });

  it("formats AllowanceChanged", () => {
    const err: IcrcError = {
      variant: "AllowanceChanged",
      details: { current_allowance: 200n },
    };
    expect(formatIcrcError(err)).toBe(
      "AllowanceChanged: current_allowance=200",
    );
  });

  it("formats CreatedInFuture", () => {
    const err: IcrcError = {
      variant: "CreatedInFuture",
      details: { ledger_time: 1700000000n },
    };
    expect(formatIcrcError(err)).toBe(
      "CreatedInFuture: ledger_time=1700000000",
    );
  });

  it("formats Expired", () => {
    const err: IcrcError = {
      variant: "Expired",
      details: { ledger_time: 1600000000n },
    };
    expect(formatIcrcError(err)).toBe("Expired: ledger_time=1600000000");
  });

  it("formats Duplicate", () => {
    const err: IcrcError = {
      variant: "Duplicate",
      details: { duplicate_of: 42n },
    };
    expect(formatIcrcError(err)).toBe("Duplicate: duplicate_of=42");
  });

  it("formats GenericError", () => {
    const err: IcrcError = {
      variant: "GenericError",
      details: { error_code: 1n, message: "something went wrong" },
    };
    expect(formatIcrcError(err)).toBe(
      "GenericError: [1] something went wrong",
    );
  });

  it("formats GenericBatchError", () => {
    const err: IcrcError = {
      variant: "GenericBatchError",
      details: { error_code: 2n, message: "batch failed" },
    };
    expect(formatIcrcError(err)).toBe(
      "GenericBatchError: [2] batch failed",
    );
  });

  it("returns variant name for null-detail variants", () => {
    const nullVariants: IcrcError["variant"][] = [
      "TemporarilyUnavailable",
      "NonExistingTokenId",
      "InvalidRecipient",
      "Unauthorized",
      "InvalidSpender",
      "ApprovalDoesNotExist",
    ];
    for (const variant of nullVariants) {
      expect(formatIcrcError({ variant, details: null })).toBe(variant);
    }
  });
});
