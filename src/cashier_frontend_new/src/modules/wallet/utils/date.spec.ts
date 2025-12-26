import { describe, it, expect } from "vitest";
import { formatDate, getDateKey, groupTransactionsByDate } from "./date";
import { TransactionKind, type DisplayTransaction } from "$modules/token/types";

describe("formatDate", () => {
  it("should format timestamp to readable date string", () => {
    const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toBe("Jan 15, 2024");
  });

  it("should handle different months correctly", () => {
    const timestamp = new Date("2024-12-25T00:00:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toBe("Dec 25, 2024");
  });

  it("should handle year transitions correctly", () => {
    const timestamp = new Date("2023-12-31T12:00:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toBe("Dec 31, 2023");
  });
});

describe("getDateKey", () => {
  it("should generate consistent date key for same day", () => {
    const morning = new Date("2024-01-15T08:00:00Z").getTime();
    const evening = new Date("2024-01-15T20:00:00Z").getTime();

    expect(getDateKey(morning)).toBe(getDateKey(evening));
  });

  it("should generate different keys for different days", () => {
    const day1 = new Date("2024-01-15T10:00:00Z").getTime();
    const day2 = new Date("2024-01-16T10:00:00Z").getTime();

    expect(getDateKey(day1)).not.toBe(getDateKey(day2));
  });

  it("should generate key in correct format", () => {
    const timestamp = new Date("2024-01-15T10:00:00Z").getTime();
    const key = getDateKey(timestamp);

    // Key should contain year, month (0-11), and day
    expect(key).toMatch(/^\d{4}-\d{1,2}-\d{1,2}$/);
  });
});

describe("groupTransactionsByDate", () => {
  const mockTransactions: DisplayTransaction[] = [
    {
      timestamp: new Date("2024-01-15T10:00:00Z").getTime(),
      amount: 100,
      kind: TransactionKind.TRANSFER,
      isOutgoing: false,
    },
    {
      timestamp: new Date("2024-01-15T14:00:00Z").getTime(),
      amount: 50,
      kind: TransactionKind.TRANSFER,
      isOutgoing: true,
    },
    {
      timestamp: new Date("2024-01-16T09:00:00Z").getTime(),
      amount: 200,
      kind: TransactionKind.TRANSFER,
      isOutgoing: false,
    },
    {
      timestamp: new Date("2024-01-14T18:00:00Z").getTime(),
      amount: 75,
      kind: TransactionKind.TRANSFER,
      isOutgoing: true,
    },
  ];

  it("should group transactions by date", () => {
    const result = groupTransactionsByDate(mockTransactions);

    expect(result).toHaveLength(3);
    expect(result[0].transactions).toHaveLength(1); // Jan 16
    expect(result[1].transactions).toHaveLength(2); // Jan 15
    expect(result[2].transactions).toHaveLength(1); // Jan 14
  });

  it("should sort groups by date (newest first)", () => {
    const result = groupTransactionsByDate(mockTransactions);

    expect(result[0].date).toBe("Jan 16, 2024");
    expect(result[1].date).toBe("Jan 15, 2024");
    expect(result[2].date).toBe("Jan 14, 2024");
  });

  it("should sort transactions within each group by timestamp (newest first)", () => {
    const result = groupTransactionsByDate(mockTransactions);
    const jan15Group = result[1];

    expect(jan15Group.transactions[0].timestamp).toBeGreaterThan(
      jan15Group.transactions[1].timestamp,
    );
  });

  it("should handle empty array", () => {
    const result = groupTransactionsByDate([]);
    expect(result).toEqual([]);
  });

  it("should handle single transaction", () => {
    const singleTx: DisplayTransaction[] = [
      {
        timestamp: new Date("2024-01-15T10:00:00Z").getTime(),
        amount: 100,
        kind: TransactionKind.TRANSFER,
        isOutgoing: false,
      },
    ];

    const result = groupTransactionsByDate(singleTx);

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("Jan 15, 2024");
    expect(result[0].transactions).toHaveLength(1);
  });

  it("should preserve transaction data", () => {
    const result = groupTransactionsByDate(mockTransactions);
    const allTransactions = result.flatMap((group) => group.transactions);

    expect(allTransactions).toHaveLength(mockTransactions.length);

    allTransactions.forEach((tx) => {
      expect(tx).toHaveProperty("timestamp");
      expect(tx).toHaveProperty("amount");
      expect(tx).toHaveProperty("kind");
    });
  });

  it("should handle transactions with same timestamp", () => {
    const sameTimestamp = new Date("2024-01-15T10:00:00Z").getTime();
    const txs: DisplayTransaction[] = [
      {
        timestamp: sameTimestamp,
        amount: 100,
        kind: TransactionKind.TRANSFER,
        isOutgoing: false,
      },
      {
        timestamp: sameTimestamp,
        amount: 50,
        kind: TransactionKind.TRANSFER,
        isOutgoing: true,
      },
    ];

    const result = groupTransactionsByDate(txs);

    expect(result).toHaveLength(1);
    expect(result[0].transactions).toHaveLength(2);
  });

  it("should not mutate original array", () => {
    const original = [...mockTransactions];
    groupTransactionsByDate(mockTransactions);

    expect(mockTransactions).toEqual(original);
  });
});
