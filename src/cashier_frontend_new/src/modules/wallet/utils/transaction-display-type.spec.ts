import { describe, it, expect } from "vitest";
import {
  getTransactionLabelKey,
  isTransactionOutgoing,
} from "$modules/wallet/utils/transaction-display-type";
import {
  TransactionKind,
  type TokenTransaction,
  type TokenWithPriceAndBalance,
} from "$modules/token/types";
import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";

const USER_PRINCIPAL = "aaaaa-aa";
const OTHER_PRINCIPAL = "bbbbb-bb";

// Helper to create minimal TokenTransaction
function createTx(kind: string, from?: string, to?: string): TokenTransaction {
  return {
    id: 1n,
    kind: kind as TokenTransaction["kind"],
    amount: 100n,
    timestampMs: Date.now(),
    from,
    to,
  };
}

// Helper to create mock token (ICRC - not ICP)
function createIcrcToken(): TokenWithPriceAndBalance {
  return {
    name: "Test Token",
    symbol: "TEST",
    address: "rrkah-fqaaa-aaaaa-aaaaq-cai", // Not ICP ledger
    decimals: 8,
    enabled: true,
    fee: 10000n,
    is_default: false,
    balance: 0n,
    priceUSD: 0,
  };
}

// Helper to create ICP token
function createIcpToken(): TokenWithPriceAndBalance {
  return {
    name: "Internet Computer",
    symbol: "ICP",
    address: ICP_LEDGER_CANISTER_ID,
    decimals: 8,
    enabled: true,
    fee: 10000n,
    is_default: true,
    balance: 0n,
    priceUSD: 10,
  };
}

describe("isTransactionOutgoing", () => {
  const icrcToken = createIcrcToken();

  it("should return Ok(true) for APPROVE kind", () => {
    const tx = createTx(TransactionKind.APPROVE, OTHER_PRINCIPAL);
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });

  it("should return Ok(true) for BURN kind", () => {
    const tx = createTx(TransactionKind.BURN, USER_PRINCIPAL);
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });

  it("should return Ok(false) for MINT kind", () => {
    const tx = createTx(TransactionKind.MINT, undefined, USER_PRINCIPAL);
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(false);
  });

  it("should return Ok(true) when user is sender (transfer)", () => {
    const tx = createTx(
      TransactionKind.TRANSFER,
      USER_PRINCIPAL,
      OTHER_PRINCIPAL,
    );
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });

  it("should return Ok(false) when user is recipient (transfer)", () => {
    const tx = createTx(
      TransactionKind.TRANSFER,
      OTHER_PRINCIPAL,
      USER_PRINCIPAL,
    );
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(false);
  });

  it("should return Ok(true) for self-transfer (from == user)", () => {
    // User sends to themselves - should be outgoing
    const tx = createTx(
      TransactionKind.TRANSFER,
      USER_PRINCIPAL,
      USER_PRINCIPAL,
    );
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(true);
  });

  it("should return Err when user is neither sender nor recipient", () => {
    const tx = createTx(TransactionKind.TRANSFER, OTHER_PRINCIPAL, "ccccc-cc");
    const result = isTransactionOutgoing(tx, icrcToken, USER_PRINCIPAL);
    expect(result.isErr()).toBe(true);
  });

  // ICP token tests - derives accountId internally
  describe("ICP token (uses accountId)", () => {
    const icpToken = createIcpToken();
    // Use a valid principal for ICP tests
    const validPrincipal = "2vxsx-fae"; // anonymous principal

    it("should derive accountId and match for ICP transfers", () => {
      const tx = createTx(
        TransactionKind.TRANSFER,
        validPrincipal,
        OTHER_PRINCIPAL,
      );
      const result = isTransactionOutgoing(tx, icpToken, validPrincipal);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });

    it("should return Err for ICP with invalid principal", () => {
      const tx = createTx(TransactionKind.TRANSFER, "invalid", OTHER_PRINCIPAL);
      const result = isTransactionOutgoing(
        tx,
        icpToken,
        "invalid-principal-format",
      );
      expect(result.isErr()).toBe(true);
    });
  });
});

describe("getTransactionLabelKey", () => {
  it("should return sent key for outgoing transfer", () => {
    expect(getTransactionLabelKey(TransactionKind.TRANSFER, true)).toBe(
      "wallet.tokenInfo.sent",
    );
  });

  it("should return received key for incoming transfer", () => {
    expect(getTransactionLabelKey(TransactionKind.TRANSFER, false)).toBe(
      "wallet.tokenInfo.received",
    );
  });

  it("should return approve key for approve kind", () => {
    expect(getTransactionLabelKey(TransactionKind.APPROVE, true)).toBe(
      "wallet.tokenInfo.approve",
    );
  });

  it("should return mint key for mint kind", () => {
    expect(getTransactionLabelKey(TransactionKind.MINT, false)).toBe(
      "wallet.tokenInfo.mint",
    );
  });

  it("should return burn key for burn kind", () => {
    expect(getTransactionLabelKey(TransactionKind.BURN, true)).toBe(
      "wallet.tokenInfo.burn",
    );
  });
});
