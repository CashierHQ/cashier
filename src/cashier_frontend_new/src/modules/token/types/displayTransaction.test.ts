import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisplayTransactionMapper } from "./displayTransaction";
import { TransactionKind } from "./transactionKind";
import type { TokenTransaction } from "./tokenTransaction";
import type { TokenWithPriceAndBalance } from "./tokenMetadata";

// Mock isTransactionOutgoing
vi.mock("$modules/wallet/utils/transaction-display-type", () => ({
  isTransactionOutgoing: vi.fn(),
}));

import { isTransactionOutgoing } from "$modules/wallet/utils/transaction-display-type";
import { Ok, Err } from "ts-results-es";

const mockedIsTransactionOutgoing = vi.mocked(isTransactionOutgoing);

const USER_PRINCIPAL = "aaaaa-aa";

function createTx(
  kind: string,
  amount: bigint,
  timestampMs: number,
): TokenTransaction {
  return {
    id: 1n,
    kind: kind as TokenTransaction["kind"],
    amount,
    timestampMs,
  };
}

function createToken(decimals = 8): TokenWithPriceAndBalance {
  return {
    name: "Test Token",
    symbol: "TEST",
    address: "rrkah-fqaaa-aaaaa-aaaaq-cai",
    decimals,
    enabled: true,
    fee: 10000n,
    is_default: false,
    balance: 0n,
    priceUSD: 0,
  };
}

describe("DisplayTransactionMapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fromTokenTransaction", () => {
    it("returns empty array if tokenDetails undefined", () => {
      const txs = [createTx(TransactionKind.TRANSFER, 100n, 1000)];
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        undefined,
      );
      expect(result).toEqual([]);
    });

    it("returns empty array if userPrincipal undefined", () => {
      const txs = [createTx(TransactionKind.TRANSFER, 100n, 1000)];
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        undefined,
        createToken(),
      );
      expect(result).toEqual([]);
    });

    it("returns empty array for empty tx list", () => {
      const result = DisplayTransactionMapper.fromTokenTransaction(
        [],
        USER_PRINCIPAL,
        createToken(),
      );
      expect(result).toEqual([]);
    });

    it("maps outgoing transaction correctly", () => {
      mockedIsTransactionOutgoing.mockReturnValue(Ok(true));
      const txs = [createTx(TransactionKind.TRANSFER, 100000000n, 1700000000)];
      const token = createToken(8);

      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: TransactionKind.TRANSFER,
        isOutgoing: true,
        amount: 1, // 100000000 / 10^8
        timestamp: 1700000000,
      });
    });

    it("maps incoming transaction correctly", () => {
      mockedIsTransactionOutgoing.mockReturnValue(Ok(false));
      const txs = [createTx(TransactionKind.MINT, 250000000n, 1700000001)];
      const token = createToken(8);

      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: TransactionKind.MINT,
        isOutgoing: false,
        amount: 2.5,
        timestamp: 1700000001,
      });
    });

    it("filters out transactions with error result", () => {
      mockedIsTransactionOutgoing
        .mockReturnValueOnce(Ok(true))
        .mockReturnValueOnce(Err(new Error("Cannot determine direction")))
        .mockReturnValueOnce(Ok(false));

      const txs = [
        createTx(TransactionKind.TRANSFER, 100n, 1000),
        createTx(TransactionKind.TRANSFER, 200n, 2000), // This one errors
        createTx(TransactionKind.TRANSFER, 300n, 3000),
      ];
      const token = createToken(8);

      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1000);
      expect(result[1].timestamp).toBe(3000);
    });

    it("handles different decimals correctly", () => {
      mockedIsTransactionOutgoing.mockReturnValue(Ok(true));
      const txs = [createTx(TransactionKind.BURN, 1000000n, 1000)];
      const token = createToken(6); // 6 decimals

      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      expect(result[0].amount).toBe(1); // 1000000 / 10^6
    });

    it("preserves all transaction kinds", () => {
      mockedIsTransactionOutgoing.mockReturnValue(Ok(true));
      const kinds = [
        TransactionKind.TRANSFER,
        TransactionKind.MINT,
        TransactionKind.BURN,
        TransactionKind.APPROVE,
      ];
      const txs = kinds.map((kind, i) => createTx(kind, 100n, i * 1000));
      const token = createToken();

      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      expect(result.map((r) => r.kind)).toEqual(kinds);
    });
  });
});
