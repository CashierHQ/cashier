// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { TransactionRecord } from "../../types/transaction-record.speculative";
import { groupTransactionsByDate } from "./transactionHistoryService";

describe("groupTransactionsByDate", () => {
  it("should group transactions by date", () => {
    const transactions = [
      {
        createdAt: new Date("2024-03-01T10:15:00Z"),
      },
      {
        createdAt: new Date("2024-03-01T15:30:00Z"),
      },
      {
        createdAt: new Date("2024-03-02T08:00:00Z"),
      },
    ] as TransactionRecord[];

    const result = groupTransactionsByDate(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2024-03-02T00:00:00.000Z");
    expect(result[0].transactions).toHaveLength(1);
    expect(result[1].date).toBe("2024-03-01T00:00:00.000Z");
    expect(result[1].transactions).toHaveLength(2);
  });

  it("should return an empty array if no transactions are provided", () => {
    const result = groupTransactionsByDate([]);
    expect(result).toEqual([]);
  });
});
