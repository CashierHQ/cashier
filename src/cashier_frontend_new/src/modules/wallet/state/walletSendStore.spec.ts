import { beforeEach, describe, expect, it, vi } from "vitest";
import { Err, Ok } from "ts-results-es";
import { Principal } from "@icp-sdk/core/principal";
import { TxState } from "$modules/wallet/types/walletSendStore";

// Hoisted mock functions for new store methods
const {
  mockGetRedeemFee,
  mockGetIcpBalance,
  mockCreateRuneExportBridgeTransaction,
  mockGetMinterInfo,
  mockGetWithdrawalFee,
  mockCreateExportBridgeTransaction,
  mockCalculateMaxSendAmount,
} = vi.hoisted(() => ({
  mockGetRedeemFee: vi.fn(),
  mockGetIcpBalance: vi.fn(),
  mockCreateRuneExportBridgeTransaction: vi.fn(),
  mockGetMinterInfo: vi.fn(),
  mockGetWithdrawalFee: vi.fn(),
  mockCreateExportBridgeTransaction: vi.fn(),
  mockCalculateMaxSendAmount: vi.fn(),
}));

// Mock dependencies
vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

vi.mock("$modules/shared/utils/converter", () => ({
  formatBalanceUnits: (amount: number, decimals: number) =>
    BigInt(Math.floor(amount * 10 ** decimals)),
  parseBalanceUnits: (amount: bigint, decimals: number) =>
    Number(amount) / 10 ** decimals,
}));

vi.mock("$modules/token/constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  CKBTC_CANISTER_ID: "mxzaz-hqaaa-aaaar-qaada-cai",
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
    query: {
      data: [],
    },
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

vi.mock("$modules/bitcoin/services/omnityIcpService", () => ({
  omnityIcpService: {
    getRedeemFee: mockGetRedeemFee,
  },
}));

vi.mock("$modules/token/services/icpLedger", () => ({
  icpLedgerService: {
    getBalance: mockGetIcpBalance,
  },
}));

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    createRuneExportBridgeTransaction: mockCreateRuneExportBridgeTransaction,
    createExportBridgeTransaction: mockCreateExportBridgeTransaction,
  },
}));

vi.mock("$modules/bitcoin/services/ckBTCMinterService", () => ({
  ckBTCMinterService: {
    getMinterInfo: mockGetMinterInfo,
    getWithdrawalFee: mockGetWithdrawalFee,
  },
}));

vi.mock("$modules/links/utils/amountCalculator", () => ({
  calculateMaxSendAmount: mockCalculateMaxSendAmount,
}));

// Import after mocks
import { walletSendStore } from "$modules/wallet/state/walletSendStore.svelte";
import { ReceiveAddressType } from "$modules/wallet/types";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

// Fixtures
const fixture_of_rune_token = (
  overrides: Partial<TokenWithPriceAndBalance> = {},
): TokenWithPriceAndBalance =>
  ({
    address: "rune-canister-id",
    name: "Uncommon Goods",
    symbol: "UNCOMMON•GOODS",
    decimals: 8,
    fee: 10n,
    enabled: true,
    is_default: false,
    indexId: undefined,
    isRune: true,
    runeInfo: {
      runeId: "UNCOMMON•GOODS",
      tokenId: "omnity-token-id",
    },
    balance: 1_000_000n,
    usdValue: 0,
    ...overrides,
  }) as TokenWithPriceAndBalance;

const fixture_of_ckbtc_token = (
  overrides: Partial<TokenWithPriceAndBalance> = {},
): TokenWithPriceAndBalance =>
  ({
    address: "mxzaz-hqaaa-aaaar-qaada-cai",
    name: "ckBTC",
    symbol: "ckBTC",
    decimals: 8,
    fee: 10n,
    enabled: true,
    is_default: true,
    indexId: undefined,
    isRune: false,
    balance: 10_000_000n,
    usdValue: 0,
    ...overrides,
  }) as TokenWithPriceAndBalance;

const fixture_of_bridge_transaction = () => ({
  bridge_id: "bridge_1",
  btc_address: "tb1qreceiver",
  asset_infos: [],
  bridge_type: "Export" as const,
  status: "Created" as const,
  total_amount: 1_000n,
  created_at_ts: 0n,
  icp_address: "aaaaa-aa",
  deposit_fee: null,
  withdrawal_fee: null,
  btc_fee: null,
  btc_txid: null,
  ckbtc_block_id: null,
  block_id: null,
  block_timestamp: null,
  block_confirmations: [],
  retry_times: 0,
  vin: [],
  vout: [],
  omnity_ticket_id: null,
  details: { kind: "runes" as const, omnity_ticket_id: null },
});

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
    const selectedToken = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const receiveAddress = "valid-principal";
    const amount = 1;
    const receiveType = ReceiveAddressType.PRINCIPAL;
    const maxAmount = 10;

    it("should return Ok for valid params", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        receiveAddress,
        amount,
        receiveType,
        maxAmount,
      );
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(true);
    });

    it("should return Err when selectedToken is empty", () => {
      const result = walletSendStore.validateSend(
        "",
        receiveAddress,
        amount,
        receiveType,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.selectToken");
    });

    it("should return Err when selectedToken is only whitespace", () => {
      const result = walletSendStore.validateSend(
        "   ",
        receiveAddress,
        amount,
        receiveType,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.selectToken");
    });

    it("should return Err when receiveAddress is empty", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        "",
        amount,
        receiveType,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.enterAddress");
    });

    it("should return Err when receiveAddress is only whitespace", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        "   ",
        amount,
        receiveType,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.enterAddress");
    });

    it("should return Err for invalid principal address", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        "invalid-principal",
        amount,
        ReceiveAddressType.PRINCIPAL,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.invalidPrincipal");
    });

    it("should return Err for invalid account ID", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        "invalid-account",
        amount,
        ReceiveAddressType.ACCOUNT_ID,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("wallet.send.errors.invalidAccountId");
    });

    it("should validate valid account ID", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        "d3e13d4777e22367532053190b6c6ccf57444a61337e996242b1abfb52cf92c8",
        amount,
        ReceiveAddressType.ACCOUNT_ID,
        maxAmount,
      );
      expect(result.isOk()).toBe(true);
    });

    it("should return Err when amount is zero", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        receiveAddress,
        0,
        receiveType,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.amountGreaterThanZero",
      );
    });

    it("should return Err when amount is negative", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        receiveAddress,
        -1,
        receiveType,
        maxAmount,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.amountGreaterThanZero",
      );
    });

    it("should return Err when amount exceeds maxAmount", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        receiveAddress,
        15,
        receiveType,
        10,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain(
        "wallet.send.errors.amountExceedsMax",
      );
    });

    it("should return Ok when amount equals maxAmount", () => {
      const result = walletSendStore.validateSend(
        selectedToken,
        receiveAddress,
        10,
        receiveType,
        10,
      );
      expect(result.isOk()).toBe(true);
    });

    it("should validate a valid Bitcoin address for ckBTC exports", () => {
      const result = walletSendStore.validateSend(
        "mxzaz-hqaaa-aaaar-qaada-cai",
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        amount,
        receiveType,
        maxAmount,
        true,
      );
      expect(result.isOk()).toBe(true);
    });

    it("should reject an invalid Bitcoin address for ckBTC exports", () => {
      const result = walletSendStore.validateSend(
        "mxzaz-hqaaa-aaaar-qaada-cai",
        "not-a-btc-address",
        amount,
        receiveType,
        maxAmount,
        true,
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.invalidBitcoinAddress",
      );
    });
  });

  describe("createRuneExportBridge", () => {
    const nativeBtcAddress = "tb1qreceiver";
    const amount = 1;
    const selectedTokenObj = fixture_of_rune_token();

    it("it_should_fail_due_to_redeem_fee_fetch_error", async () => {
      // Arrange
      mockGetRedeemFee.mockResolvedValue(Err("Network error"));

      // Act
      const result = await walletSendStore.createRuneExportBridge(
        nativeBtcAddress,
        amount,
        selectedTokenObj,
      );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Network error");
    });

    it("it_should_fail_due_to_insufficient_icp_balance", async () => {
      // Arrange
      const redeemFee = 10_000n;
      mockGetRedeemFee.mockResolvedValue(Ok(redeemFee));
      mockGetIcpBalance.mockResolvedValue(5_000n); // less than fee

      // Act
      const result = await walletSendStore.createRuneExportBridge(
        nativeBtcAddress,
        amount,
        selectedTokenObj,
      );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.insufficientIcpForRuneFee",
      );
    });

    it("it_should_create_bridge_with_withdrawal_fee", async () => {
      // Arrange
      const redeemFee = 10_000n;
      mockGetRedeemFee.mockResolvedValue(Ok(redeemFee));
      mockGetIcpBalance.mockResolvedValue(50_000n); // more than fee
      mockCreateRuneExportBridgeTransaction.mockResolvedValue(
        Ok(fixture_of_bridge_transaction()),
      );

      // Act
      const result = await walletSendStore.createRuneExportBridge(
        nativeBtcAddress,
        amount,
        selectedTokenObj,
      );

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCreateRuneExportBridgeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ withdrawalFee: redeemFee }),
      );
    });
  });

  describe("createCkBtcExportBridge", () => {
    const nativeBtcAddress = "tb1qreceiver";
    const amount = 0.001;
    const selectedTokenObj = fixture_of_ckbtc_token();

    it("it_should_fail_due_to_amount_below_min", async () => {
      // Arrange — 50_000 sat < 100_000 sat minimum
      mockGetMinterInfo.mockResolvedValue({
        retrieve_btc_min_amount: 100_000n,
      });

      // Act
      const result = await walletSendStore.createCkBtcExportBridge(
        nativeBtcAddress,
        0.0005, // 50_000 sat < 100_000 min
        selectedTokenObj,
      );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain(
        "wallet.send.errors.amountBelowWithdrawalMin",
      );
    });

    it("it_should_fail_due_to_amount_exceeds_max", async () => {
      // Arrange
      mockGetMinterInfo.mockResolvedValue({ retrieve_btc_min_amount: 1_000n });
      mockGetWithdrawalFee.mockResolvedValue({
        minter_fee: 500n,
        bitcoin_fee: 300n,
      });
      // totalDebit = 100_000 + 500 + 300 = 100_800, maxAmount = 50_000
      mockCalculateMaxSendAmount.mockReturnValue(Ok(50_000n));

      // Act
      const result = await walletSendStore.createCkBtcExportBridge(
        nativeBtcAddress,
        amount,
        selectedTokenObj,
      );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(
        "wallet.send.errors.amountExceedsWithdrawalMax",
      );
    });

    it("it_should_create_ckbtc_export_bridge", async () => {
      // Arrange
      mockGetMinterInfo.mockResolvedValue({ retrieve_btc_min_amount: 1_000n });
      mockGetWithdrawalFee.mockResolvedValue({
        minter_fee: 100n,
        bitcoin_fee: 100n,
      });
      // totalDebit = 100_000 + 100 + 100 = 100_200; maxAmount = 1_000_000
      mockCalculateMaxSendAmount.mockReturnValue(Ok(1_000_000n));
      mockCreateExportBridgeTransaction.mockResolvedValue(
        Ok(fixture_of_bridge_transaction()),
      );

      // Act
      const result = await walletSendStore.createCkBtcExportBridge(
        nativeBtcAddress,
        amount,
        selectedTokenObj,
      );

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCreateExportBridgeTransaction).toHaveBeenCalledWith(
        "tb1qreceiver",
        100_000n,
        100n,
        100n,
      );
    });
  });
});
