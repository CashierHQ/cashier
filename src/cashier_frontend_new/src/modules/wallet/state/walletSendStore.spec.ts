import { beforeEach, describe, expect, it, vi } from "vitest";
import { Err, Ok } from "ts-results-es";
import { Principal } from "@dfinity/principal";
import {
  TxState,
  type ValidateSendParams,
} from "$modules/wallet/types/walletSendStore";

// Mock dependencies
vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

vi.mock("$modules/shared/utils/converter", () => ({
  formatBalanceUnits: (amount: number, decimals: number) =>
    BigInt(Math.floor(amount * 10 ** decimals)),
}));

vi.mock("$modules/token/constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
}));

const mockFindTokenByAddress = vi.fn();
const mockTransferTokenToPrincipal = vi.fn();
const mockTransferICPToAccount = vi.fn();

vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: {
    findTokenByAddress: (addr: string) => mockFindTokenByAddress(addr),
    transferTokenToPrincipal: (token: string, to: Principal, amount: bigint) =>
      mockTransferTokenToPrincipal(token, to, amount),
    transferICPToAccount: (to: string, amount: bigint) =>
      mockTransferICPToAccount(to, amount),
  },
}));

vi.mock("$modules/wallet/utils/address", () => ({
  isValidPrincipal: (addr: string) => {
    if (addr === "valid-principal" || addr === "ryjl3-tyaaa-aaaaa-aaaba-cai") {
      return Ok(Principal.anonymous());
    }
    return Err("Invalid Principal address");
  },
  isValidAccountId: (addr: string) => {
    if (
      addr ===
      "d3e13d4777e22367532053190b6c6ccf57444a61337e996242b1abfb52cf92c8"
    ) {
      return Ok({});
    }
    return Err("Invalid Account Identifier");
  },
}));

// Import after mocks
import { walletSendStore } from "./walletSendStore.svelte";
import { ReceiveAddressType } from "../types";

describe("WalletSendStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should have default txState as CONFIRM", () => {
      expect(walletSendStore.txState).toBe(TxState.CONFIRM);
    });
  });

  describe("validateSend", () => {
    const baseParams: ValidateSendParams = {
      selectedToken: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      receiveAddress: "valid-principal",
      amount: 1,
      receiveType: ReceiveAddressType.PRINCIPAL,
      maxAmount: 10,
    };

    it("should return Ok for valid params", () => {
      const result = walletSendStore.validateSend(baseParams);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });

    it("should return Err when selectedToken is empty", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        selectedToken: "",
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.selectToken");
    });

    it("should return Err when selectedToken is only whitespace", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        selectedToken: "   ",
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.selectToken");
    });

    it("should return Err when receiveAddress is empty", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        receiveAddress: "",
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.enterAddress");
    });

    it("should return Err when receiveAddress is only whitespace", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        receiveAddress: "   ",
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.enterAddress");
    });

    it("should return Err for invalid principal address", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        receiveType: ReceiveAddressType.PRINCIPAL,
        receiveAddress: "invalid-principal",
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.invalidPrincipal");
    });

    it("should return Err for invalid account ID", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        receiveType: ReceiveAddressType.ACCOUNT_ID,
        receiveAddress: "invalid-account",
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.invalidAccountId");
    });

    it("should validate valid account ID", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        receiveType: ReceiveAddressType.ACCOUNT_ID,
        receiveAddress:
          "d3e13d4777e22367532053190b6c6ccf57444a61337e996242b1abfb52cf92c8",
      });
      expect(result.isOk()).toBe(true);
    });

    it("should return Err when amount is zero", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        amount: 0,
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.amountGreaterThanZero",
      );
    });

    it("should return Err when amount is negative", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        amount: -1,
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.amountGreaterThanZero",
      );
    });

    it("should return Err when amount exceeds maxAmount", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        amount: 15,
        maxAmount: 10,
      });
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain(
        "wallet.send.errors.amountExceedsMax",
      );
    });

    it("should return Ok when amount equals maxAmount", () => {
      const result = walletSendStore.validateSend({
        ...baseParams,
        amount: 10,
        maxAmount: 10,
      });
      expect(result.isOk()).toBe(true);
    });
  });
});
