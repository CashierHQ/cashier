import { describe, it, expect } from "vitest";
import {
  getDisplayType,
  getTransactionLabelKey,
  isOutgoingTransaction,
} from "./transaction-display-type";
import {
  DisplayTransactionType,
  TransactionKind,
} from "$modules/token/types";

const USER_PRINCIPAL = "aaaaa-aa";
const OTHER_PRINCIPAL = "bbbbb-bb";
const SPENDER_PRINCIPAL = "ccccc-cc";

describe("getDisplayType", () => {
  describe("non-transfer kinds", () => {
    it("should return APPROVE for approve kind", () => {
      const result = getDisplayType(
        TransactionKind.APPROVE,
        USER_PRINCIPAL,
        OTHER_PRINCIPAL,
        undefined,
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.APPROVE);
    });

    it("should return MINT for mint kind", () => {
      const result = getDisplayType(
        TransactionKind.MINT,
        undefined,
        USER_PRINCIPAL,
        undefined,
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.MINT);
    });

    it("should return BURN for burn kind", () => {
      const result = getDisplayType(
        TransactionKind.BURN,
        USER_PRINCIPAL,
        undefined,
        undefined,
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.BURN);
    });
  });

  describe("transfer kinds", () => {
    it("should return TRANSFER_FROM when outgoing with spender", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        USER_PRINCIPAL, // from: user
        OTHER_PRINCIPAL, // to: other
        SPENDER_PRINCIPAL, // spender: exists
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.TRANSFER_FROM);
    });

    it("should return RECEIVED when user is recipient", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        OTHER_PRINCIPAL, // from: other
        USER_PRINCIPAL, // to: user
        undefined,
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.RECEIVED);
    });

    it("should return SENT when user is sender (no spender)", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        USER_PRINCIPAL, // from: user
        OTHER_PRINCIPAL, // to: other
        undefined, // no spender
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.SENT);
    });

    it("should return SENT as fallback when neither from nor to match user", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        OTHER_PRINCIPAL,
        "ddddd-dd",
        undefined,
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.SENT);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined userPrincipal", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        OTHER_PRINCIPAL,
        USER_PRINCIPAL,
        undefined,
        undefined,
      );
      // Neither incoming nor outgoing matches, fallback to SENT
      expect(result).toBe(DisplayTransactionType.SENT);
    });

    it("should handle undefined from/to", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        undefined,
        undefined,
        undefined,
        USER_PRINCIPAL,
      );
      expect(result).toBe(DisplayTransactionType.SENT);
    });

    it("should prioritize TRANSFER_FROM over RECEIVED when both conditions met", () => {
      // Edge case: user sends to themselves via spender
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        USER_PRINCIPAL, // from: user (outgoing)
        USER_PRINCIPAL, // to: user (also incoming)
        SPENDER_PRINCIPAL,
        USER_PRINCIPAL,
      );
      // outgoing + spender checked first
      expect(result).toBe(DisplayTransactionType.TRANSFER_FROM);
    });

    it("should return RECEIVED for self-transfer without spender", () => {
      const result = getDisplayType(
        TransactionKind.TRANSFER,
        USER_PRINCIPAL,
        USER_PRINCIPAL,
        undefined,
        USER_PRINCIPAL,
      );
      // Both from and to are user, but incoming check comes before SENT fallback
      expect(result).toBe(DisplayTransactionType.RECEIVED);
    });
  });
});

describe("getTransactionLabelKey", () => {
  it("should return correct i18n key for each type", () => {
    expect(getTransactionLabelKey(DisplayTransactionType.SENT)).toBe(
      "wallet.tokenInfo.sent",
    );
    expect(getTransactionLabelKey(DisplayTransactionType.RECEIVED)).toBe(
      "wallet.tokenInfo.received",
    );
    expect(getTransactionLabelKey(DisplayTransactionType.TRANSFER_FROM)).toBe(
      "wallet.tokenInfo.transferFrom",
    );
    expect(getTransactionLabelKey(DisplayTransactionType.APPROVE)).toBe(
      "wallet.tokenInfo.approve",
    );
    expect(getTransactionLabelKey(DisplayTransactionType.MINT)).toBe(
      "wallet.tokenInfo.mint",
    );
    expect(getTransactionLabelKey(DisplayTransactionType.BURN)).toBe(
      "wallet.tokenInfo.burn",
    );
  });
});

describe("isOutgoingTransaction", () => {
  it("should return true for outgoing types", () => {
    expect(isOutgoingTransaction(DisplayTransactionType.SENT)).toBe(true);
    expect(isOutgoingTransaction(DisplayTransactionType.TRANSFER_FROM)).toBe(true);
    expect(isOutgoingTransaction(DisplayTransactionType.BURN)).toBe(true);
  });

  it("should return false for incoming types", () => {
    expect(isOutgoingTransaction(DisplayTransactionType.RECEIVED)).toBe(false);
    expect(isOutgoingTransaction(DisplayTransactionType.MINT)).toBe(false);
    expect(isOutgoingTransaction(DisplayTransactionType.APPROVE)).toBe(false);
  });
});
