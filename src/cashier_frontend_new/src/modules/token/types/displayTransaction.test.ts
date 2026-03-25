import { describe, it, expect, vi, beforeEach } from "vitest";
import { DisplayTransactionMapper } from "./displayTransaction";
import { TransactionKind } from "./transactionKind";
import type { TokenTransaction } from "./tokenTransaction";
import type { TokenWithPriceAndBalance } from "./tokenMetadata";

// Mock isTransactionOutgoing
vi.mock("$modules/wallet/utils/transactionDisplayType", () => ({
  isTransactionOutgoing: vi.fn(),
}));

import { isTransactionOutgoing } from "$modules/wallet/utils/transactionDisplayType";
import { Ok, Err } from "ts-results-es";

const mockedIsTransactionOutgoing = vi.mocked(isTransactionOutgoing);

// Fixtures
function fixture_of_token_transaction(
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

function fixture_of_token(decimals = 8): TokenWithPriceAndBalance {
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

const USER_PRINCIPAL = "aaaaa-aa";

describe("DisplayTransactionMapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fromTokenTransaction", () => {
    it("it_should_fail_map_due_to_missing_token_details", () => {
      // Arrange
      const txs = [
        fixture_of_token_transaction(TransactionKind.TRANSFER, 100n, 1000),
      ];

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        undefined,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("it_should_fail_map_due_to_missing_user_principal", () => {
      // Arrange
      const txs = [
        fixture_of_token_transaction(TransactionKind.TRANSFER, 100n, 1000),
      ];

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        undefined,
        fixture_of_token(),
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("it_should_return_empty_for_empty_tx_list", () => {
      // Arrange
      const txs: TokenTransaction[] = [];

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        fixture_of_token(),
      );

      // Assert
      expect(result).toEqual([]);
    });

    it("it_should_filter_out_burn_and_approve_transactions", () => {
      // Arrange
      mockedIsTransactionOutgoing.mockReturnValue(Ok(true));
      const txs = [
        fixture_of_token_transaction(TransactionKind.TRANSFER, 100n, 1000),
        fixture_of_token_transaction(TransactionKind.BURN, 200n, 2000),
        fixture_of_token_transaction(TransactionKind.MINT, 300n, 3000),
        fixture_of_token_transaction(TransactionKind.APPROVE, 400n, 4000),
      ];

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        fixture_of_token(),
      );

      // Assert
      expect(result.map((r) => r.kind)).toEqual([
        TransactionKind.TRANSFER,
        TransactionKind.MINT,
      ]);
    });

    it("it_should_filter_out_transactions_with_undeterminable_direction", () => {
      // Arrange
      mockedIsTransactionOutgoing
        .mockReturnValueOnce(Ok(true))
        .mockReturnValueOnce(Err(new Error("Cannot determine direction")))
        .mockReturnValueOnce(Ok(false));
      const txs = [
        fixture_of_token_transaction(TransactionKind.TRANSFER, 100n, 1000),
        fixture_of_token_transaction(TransactionKind.TRANSFER, 200n, 2000),
        fixture_of_token_transaction(TransactionKind.TRANSFER, 300n, 3000),
      ];

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        fixture_of_token(),
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toBe(1000);
      expect(result[1].timestamp).toBe(3000);
    });

    it("it_should_map_outgoing_transfer_transaction", () => {
      // Arrange
      mockedIsTransactionOutgoing.mockReturnValue(Ok(true));
      const txs = [
        fixture_of_token_transaction(
          TransactionKind.TRANSFER,
          100000000n,
          1700000000,
        ),
      ];
      const token = fixture_of_token(8);

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: TransactionKind.TRANSFER,
        isOutgoing: true,
        amount: 1, // 100000000 / 10^8
        timestamp: 1700000000,
      });
    });

    it("it_should_map_incoming_mint_transaction", () => {
      // Arrange
      mockedIsTransactionOutgoing.mockReturnValue(Ok(false));
      const txs = [
        fixture_of_token_transaction(
          TransactionKind.MINT,
          250000000n,
          1700000001,
        ),
      ];
      const token = fixture_of_token(8);

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        kind: TransactionKind.MINT,
        isOutgoing: false,
        amount: 2.5,
        timestamp: 1700000001,
      });
    });

    it("it_should_apply_token_decimals_to_amount", () => {
      // Arrange
      mockedIsTransactionOutgoing.mockReturnValue(Ok(true));
      const txs = [
        fixture_of_token_transaction(TransactionKind.TRANSFER, 1000000n, 1000),
      ];
      const token = fixture_of_token(6);

      // Act
      const result = DisplayTransactionMapper.fromTokenTransaction(
        txs,
        USER_PRINCIPAL,
        token,
      );

      // Assert
      expect(result[0].amount).toBe(1); // 1000000 / 10^6
    });
  });
});
