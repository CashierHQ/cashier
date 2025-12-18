import { describe, it, expect } from "vitest";
import {
  mapTransactionToUI,
  groupTransactionsByDate,
  type UITransaction,
} from "./transaction-mapper";
import type { TokenTransaction } from "../types";

describe("mapTransactionToUI", () => {
  const userOwner = "abc-principal";
  const decimals = 8;

  it("maps mint transaction as received", () => {
    const tx: TokenTransaction = {
      id: BigInt(1),
      kind: "mint",
      timestamp: BigInt(1700000000000000000), // nanoseconds
      to: { owner: userOwner },
      amount: BigInt(100000000), // 1.0 with 8 decimals
    };

    const result = mapTransactionToUI(tx, userOwner, decimals);

    expect(result.type).toBe("received");
    expect(result.amount).toBe(1.0);
    expect(result.address).toBe(userOwner);
    expect(result.id).toBe("1");
  });

  it("maps burn transaction as sent", () => {
    const tx: TokenTransaction = {
      id: BigInt(2),
      kind: "burn",
      timestamp: BigInt(1700000000000000000),
      from: { owner: userOwner },
      amount: BigInt(50000000), // 0.5
    };

    const result = mapTransactionToUI(tx, userOwner, decimals);

    expect(result.type).toBe("sent");
    expect(result.amount).toBe(0.5);
  });

  it("maps transfer from user as sent", () => {
    const otherAddress = "xyz-principal";
    const tx: TokenTransaction = {
      id: BigInt(3),
      kind: "transfer",
      timestamp: BigInt(1700000000000000000),
      from: { owner: userOwner },
      to: { owner: otherAddress },
      amount: BigInt(25000000), // 0.25
    };

    const result = mapTransactionToUI(tx, userOwner, decimals);

    expect(result.type).toBe("sent");
    expect(result.address).toBe(otherAddress);
    expect(result.amount).toBe(0.25);
  });

  it("maps transfer to user as received", () => {
    const otherAddress = "xyz-principal";
    const tx: TokenTransaction = {
      id: BigInt(4),
      kind: "transfer",
      timestamp: BigInt(1700000000000000000),
      from: { owner: otherAddress },
      to: { owner: userOwner },
      amount: BigInt(75000000), // 0.75
    };

    const result = mapTransactionToUI(tx, userOwner, decimals);

    expect(result.type).toBe("received");
    expect(result.address).toBe(otherAddress);
    expect(result.amount).toBe(0.75);
  });

  it("maps approve transaction as sent", () => {
    const spenderAddress = "spender-principal";
    const tx: TokenTransaction = {
      id: BigInt(5),
      kind: "approve",
      timestamp: BigInt(1700000000000000000),
      spender: { owner: spenderAddress },
      amount: BigInt(100000000),
    };

    const result = mapTransactionToUI(tx, userOwner, decimals);

    expect(result.type).toBe("sent");
    expect(result.address).toBe(spenderAddress);
  });

  it("converts timestamp from nanoseconds to milliseconds", () => {
    const tx: TokenTransaction = {
      id: BigInt(6),
      kind: "mint",
      timestamp: BigInt(1700000000000000000), // nanoseconds
      to: { owner: userOwner },
      amount: BigInt(100000000),
    };

    const result = mapTransactionToUI(tx, userOwner, decimals);

    expect(result.timestamp).toBe(1700000000000); // milliseconds
  });

  it("handles different decimal places", () => {
    const tx: TokenTransaction = {
      id: BigInt(7),
      kind: "mint",
      timestamp: BigInt(1700000000000000000),
      to: { owner: userOwner },
      amount: BigInt(1000000), // With 6 decimals = 1.0
    };

    const result = mapTransactionToUI(tx, userOwner, 6);

    expect(result.amount).toBe(1.0);
  });

  describe("ICP AccountIdentifier support", () => {
    const userPrincipal = "abc-principal";
    const userAccountId = "abc123def456"; // hex AccountIdentifier

    it("maps ICP transfer from user as sent using AccountIdentifier", () => {
      const otherAccountId = "xyz789";
      const tx: TokenTransaction = {
        id: BigInt(8),
        kind: "transfer",
        timestamp: BigInt(1700000000000000000),
        from: { owner: userAccountId }, // ICP uses AccountIdentifier hex
        to: { owner: otherAccountId },
        amount: BigInt(100000000),
      };

      // Pass userAccountId as 4th parameter
      const result = mapTransactionToUI(tx, userPrincipal, 8, userAccountId);

      expect(result.type).toBe("sent");
      expect(result.address).toBe(otherAccountId);
    });

    it("maps ICP transfer to user as received using AccountIdentifier", () => {
      const otherAccountId = "xyz789";
      const tx: TokenTransaction = {
        id: BigInt(9),
        kind: "transfer",
        timestamp: BigInt(1700000000000000000),
        from: { owner: otherAccountId },
        to: { owner: userAccountId }, // ICP uses AccountIdentifier hex
        amount: BigInt(100000000),
      };

      const result = mapTransactionToUI(tx, userPrincipal, 8, userAccountId);

      expect(result.type).toBe("received");
      expect(result.address).toBe(otherAccountId);
    });

    it("handles case-insensitive AccountIdentifier comparison", () => {
      const tx: TokenTransaction = {
        id: BigInt(10),
        kind: "transfer",
        timestamp: BigInt(1700000000000000000),
        from: { owner: "ABC123DEF456" }, // uppercase
        to: { owner: "xyz789" },
        amount: BigInt(100000000),
      };

      // Pass lowercase AccountIdentifier
      const result = mapTransactionToUI(tx, userPrincipal, 8, "abc123def456");

      expect(result.type).toBe("sent");
    });
  });
});

describe("groupTransactionsByDate", () => {
  it("returns empty array for empty input", () => {
    const result = groupTransactionsByDate([]);
    expect(result).toEqual([]);
  });

  it("groups transactions by date", () => {
    const transactions: UITransaction[] = [
      {
        type: "sent",
        amount: 1.0,
        address: "addr1",
        timestamp: new Date("2024-01-15T10:00:00Z").getTime(),
        id: "1",
      },
      {
        type: "received",
        amount: 2.0,
        address: "addr2",
        timestamp: new Date("2024-01-15T14:00:00Z").getTime(),
        id: "2",
      },
      {
        type: "sent",
        amount: 3.0,
        address: "addr3",
        timestamp: new Date("2024-01-14T10:00:00Z").getTime(),
        id: "3",
      },
    ];

    const result = groupTransactionsByDate(transactions);

    expect(result).toHaveLength(2);
    // Most recent date first
    expect(result[0].transactions).toHaveLength(2);
    expect(result[1].transactions).toHaveLength(1);
  });

  it("sorts transactions within groups by timestamp descending", () => {
    const transactions: UITransaction[] = [
      {
        type: "sent",
        amount: 1.0,
        address: "addr1",
        timestamp: new Date("2024-01-15T10:00:00Z").getTime(),
        id: "1",
      },
      {
        type: "received",
        amount: 2.0,
        address: "addr2",
        timestamp: new Date("2024-01-15T14:00:00Z").getTime(),
        id: "2",
      },
    ];

    const result = groupTransactionsByDate(transactions);

    // Later transaction should come first
    expect(result[0].transactions[0].id).toBe("2");
    expect(result[0].transactions[1].id).toBe("1");
  });
});
