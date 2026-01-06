import { beforeEach, describe, expect, it, vi } from "vitest";
import { Err, Ok } from "ts-results-es";
import { Principal } from "@dfinity/principal";
import {
  TxState,
  type ComputeSendFeeParams,
  type ExecuteSendParams,
  type ValidateSendParams,
} from "$modules/wallet/types/walletSendStore";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

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

const mockComputeSendFee = vi.fn();
vi.mock("$modules/shared/services/feeService", () => ({
  feeService: {
    computeSendFee: (...args: unknown[]) => mockComputeSendFee(...args),
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

  describe("computeSendFee", () => {
    const mockToken: TokenWithPriceAndBalance = {
      address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      decimals: 8,
      symbol: "ICP",
      fee: 10_000n,
      priceUSD: 10.5,
    } as TokenWithPriceAndBalance;

    const mockFeeOutput = {
      sendAmount: 100_000_000n,
      fee: 10_000n,
      totalAmount: 100_010_000n,
      symbol: "ICP",
      decimals: 8,
    };

    it("should return Ok with computed fee when params valid", () => {
      mockFindTokenByAddress.mockReturnValue(Ok(mockToken));
      mockComputeSendFee.mockReturnValue(mockFeeOutput);

      const params: ComputeSendFeeParams = {
        selectedToken: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        amount: 1,
        receiveAddress: "recipient",
      };

      const result = walletSendStore.computeSendFee(params);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockFeeOutput);
      expect(mockFindTokenByAddress).toHaveBeenCalledWith(params.selectedToken);
      expect(mockComputeSendFee).toHaveBeenCalled();
    });

    it("should return Err when selectedToken is empty", () => {
      const params: ComputeSendFeeParams = {
        selectedToken: "",
        amount: 1,
        receiveAddress: "recipient",
      };

      const result = walletSendStore.computeSendFee(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Invalid token or amount");
    });

    it("should return Err when amount is zero", () => {
      const params: ComputeSendFeeParams = {
        selectedToken: "token",
        amount: 0,
        receiveAddress: "recipient",
      };

      const result = walletSendStore.computeSendFee(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Invalid token or amount");
    });

    it("should return Err when amount is negative", () => {
      const params: ComputeSendFeeParams = {
        selectedToken: "token",
        amount: -1,
        receiveAddress: "recipient",
      };

      const result = walletSendStore.computeSendFee(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Invalid token or amount");
    });

    it("should return Err when token not found", () => {
      mockFindTokenByAddress.mockReturnValue(Err(new Error("Token not found")));

      const params: ComputeSendFeeParams = {
        selectedToken: "unknown-token",
        amount: 1,
        receiveAddress: "recipient",
      };

      const result = walletSendStore.computeSendFee(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Token not found");
    });
  });

  describe("executeSend", () => {
    const mockToken: TokenWithPriceAndBalance = {
      address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      decimals: 8,
      symbol: "ICP",
      fee: 10_000n,
    } as TokenWithPriceAndBalance;

    it("should return Ok with blockId for principal transfer", async () => {
      mockFindTokenByAddress.mockReturnValue(Ok(mockToken));
      mockTransferTokenToPrincipal.mockResolvedValue(12345n);

      const params: ExecuteSendParams = {
        selectedToken: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        receiveAddress: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        amount: 1,
        receiveType: ReceiveAddressType.PRINCIPAL,
      };

      const result = await walletSendStore.executeSend(params);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(12345n);
      expect(mockTransferTokenToPrincipal).toHaveBeenCalled();
    });

    it("should return Ok with blockId for ICP account transfer", async () => {
      mockFindTokenByAddress.mockReturnValue(Ok(mockToken));
      mockTransferICPToAccount.mockResolvedValue(67890n);

      const params: ExecuteSendParams = {
        selectedToken: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        receiveAddress:
          "d3e13d4777e22367532053190b6c6ccf57444a61337e996242b1abfb52cf92c8",
        amount: 1,
        receiveType: ReceiveAddressType.ACCOUNT_ID,
      };

      const result = await walletSendStore.executeSend(params);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(67890n);
      expect(mockTransferICPToAccount).toHaveBeenCalled();
    });

    it("should return Err when token not found", async () => {
      mockFindTokenByAddress.mockReturnValue(Err(new Error("Not found")));

      const params: ExecuteSendParams = {
        selectedToken: "unknown-token",
        receiveAddress: "recipient",
        amount: 1,
        receiveType: ReceiveAddressType.PRINCIPAL,
      };

      const result = await walletSendStore.executeSend(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.tokenNotFound");
    });

    it("should return Err on transfer failure", async () => {
      mockFindTokenByAddress.mockReturnValue(Ok(mockToken));
      mockTransferTokenToPrincipal.mockRejectedValue(
        new Error("Transfer failed"),
      );

      const params: ExecuteSendParams = {
        selectedToken: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        receiveAddress: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        amount: 1,
        receiveType: ReceiveAddressType.PRINCIPAL,
      };

      const result = await walletSendStore.executeSend(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("wallet.send.errorMessagePrefix");
    });

    it("should throw for ACCOUNT_ID with non-ICP token", async () => {
      const nonIcpToken = {
        ...mockToken,
        address: "non-icp-token",
      };
      mockFindTokenByAddress.mockReturnValue(Ok(nonIcpToken));

      const params: ExecuteSendParams = {
        selectedToken: "non-icp-token",
        receiveAddress: "account-id",
        amount: 1,
        receiveType: ReceiveAddressType.ACCOUNT_ID,
      };

      const result = await walletSendStore.executeSend(params);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("wallet.send.errorMessagePrefix");
    });
  });

  describe("getTransactionLink", () => {
    const ICP_LEDGER = "ryjl3-tyaaa-aaaaa-aaaba-cai";

    it("should return ICP transaction link for ICP ledger", () => {
      const blockId = 12345n;
      const link = walletSendStore.getTransactionLink(ICP_LEDGER, blockId);

      expect(link).toBe(
        "https://dashboard.internetcomputer.org/transaction/12345",
      );
    });

    it("should return SNS transaction link for non-ICP token", () => {
      const snsToken = "sns-token-canister-id";
      const blockId = 67890n;
      const link = walletSendStore.getTransactionLink(snsToken, blockId);

      expect(link).toBe(
        `https://dashboard.internetcomputer.org/sns/${snsToken}/transaction/67890`,
      );
    });

    it("should handle large block IDs", () => {
      const largeBlockId = 9999999999999n;
      const link = walletSendStore.getTransactionLink(ICP_LEDGER, largeBlockId);

      expect(link).toBe(
        "https://dashboard.internetcomputer.org/transaction/9999999999999",
      );
    });

    it("should handle zero block ID", () => {
      const link = walletSendStore.getTransactionLink(ICP_LEDGER, 0n);

      expect(link).toBe("https://dashboard.internetcomputer.org/transaction/0");
    });
  });
});
