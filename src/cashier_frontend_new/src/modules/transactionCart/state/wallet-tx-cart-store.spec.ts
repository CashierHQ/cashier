import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";
import type { WalletSource } from "$modules/transactionCart/types/transaction-source";
import {
  TransactionSourceType,
  FlowDirection,
} from "$modules/transactionCart/types/transaction-source";
import type {
  TokenMetadata,
  TokenWithPriceAndBalance,
} from "$modules/token/types";
import { ReceiveAddressType } from "$modules/wallet/types";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import { FeeType } from "$modules/links/types/fee";
import { Ok } from "ts-results-es";

// Mock constants
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// Hoisted mock functions
const {
  mockTransferToAccount,
  mockIcpTransferToPrincipal,
  mockTransferToPrincipal,
  mockMapWalletToAssetAndFeeList,
  MockIcpLedgerService,
  MockIcrcLedgerService,
} = vi.hoisted(() => {
  const mockTransferToAccount = vi.fn();
  const mockIcpTransferToPrincipal = vi.fn();
  const mockTransferToPrincipal = vi.fn();

  return {
    mockTransferToAccount,
    mockIcpTransferToPrincipal,
    mockTransferToPrincipal,
    mockMapWalletToAssetAndFeeList: vi.fn(),
    MockIcpLedgerService: vi.fn(() => ({
      transferToAccount: mockTransferToAccount,
      transferToPrincipal: mockIcpTransferToPrincipal,
    })),
    MockIcrcLedgerService: vi.fn(() => ({
      transferToPrincipal: mockTransferToPrincipal,
    })),
  };
});

// Mock dependencies
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "test-principal-id" },
  },
}));

vi.mock("$modules/shared/services/feeService", () => ({
  feeService: {
    mapWalletToAssetAndFeeList: mockMapWalletToAssetAndFeeList,
  },
}));

vi.mock("$modules/token/constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
}));

vi.mock("$modules/token/services/icpLedger", () => ({
  IcpLedgerService: MockIcpLedgerService,
}));

vi.mock("$modules/token/services/icrcLedger", () => ({
  IcrcLedgerService: MockIcrcLedgerService,
}));

import { authState } from "$modules/auth/state/auth.svelte";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import { WalletTxCartStore } from "./wallet-tx-cart-store.svelte";

// Test fixtures
function createMockToken(isIcp = false): TokenMetadata {
  return {
    address: isIcp ? ICP_LEDGER_CANISTER_ID : "mxzaz-hqaaa-aaaar-qaada-cai",
    name: isIcp ? "Internet Computer" : "Test Token",
    symbol: isIcp ? "ICP" : "TEST",
    decimals: 8,
    fee: 10_000n,
    enabled: true,
    is_default: isIcp,
  };
}

function createWalletSource(isIcp = false, useAccountId = false): WalletSource {
  return {
    token: createMockToken(isIcp),
    to: useAccountId ? "abc123def456" : Principal.fromText("aaaaa-aa"),
    amount: 1_000_000n,
    receiveType: useAccountId
      ? ReceiveAddressType.ACCOUNT_ID
      : ReceiveAddressType.PRINCIPAL,
  };
}

describe("WalletTxCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransferToAccount.mockResolvedValue(12345n);
    mockIcpTransferToPrincipal.mockResolvedValue(11111n);
    mockTransferToPrincipal.mockResolvedValue(67890n);
    mockMapWalletToAssetAndFeeList.mockReturnValue([
      {
        asset: {
          state: AssetProcessState.CREATED,
          label: "",
          symbol: "TEST",
          address: "test-token-address",
          amount: 1_010_000n,
          amountFormattedStr: "0.0101",
          usdValueStr: "$0.02",
          direction: FlowDirection.OUTGOING,
        },
        fee: {
          feeType: FeeType.NETWORK_FEE,
          amount: 10_000n,
          amountFormattedStr: "0.0001",
          symbol: "TEST",
          usdValue: 0.0001,
        },
      },
    ]);
    vi.mocked(authState).account = {
      owner: "test-principal-id",
    } as typeof authState.account;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create store with WalletSource", () => {
      const source = createWalletSource();
      const store = new WalletTxCartStore(source);
      expect(store).toBeInstanceOf(WalletTxCartStore);
    });
  });

  describe("initialize", () => {
    it("should initialize IcpLedgerService for ICP token", () => {
      const source = createWalletSource(true);
      const store = new WalletTxCartStore(source);

      store.initialize();

      expect(IcpLedgerService).toHaveBeenCalled();
      expect(IcrcLedgerService).not.toHaveBeenCalled();
    });

    it("should initialize IcrcLedgerService for ICRC token", () => {
      const source = createWalletSource(false);
      const store = new WalletTxCartStore(source);

      store.initialize();

      expect(IcrcLedgerService).toHaveBeenCalledWith(source.token);
      expect(IcpLedgerService).not.toHaveBeenCalled();
    });
  });

  describe("initializeAssets", () => {
    it("should populate assetAndFeeList from feeService", () => {
      const source = createWalletSource();
      const store = new WalletTxCartStore(source);

      store.initializeAssets({});

      expect(store.assetAndFeeList.length).toBe(1);
      expect(store.assetAndFeeList[0].asset.symbol).toBe("TEST");
    });
  });

  describe("computeFee", () => {
    it("should return total fee in USD", () => {
      const source = createWalletSource();
      const store = new WalletTxCartStore(source);

      store.initializeAssets({});

      expect(store.computeFee()).toBeCloseTo(0.0001);
    });
  });

  describe("execute", () => {
    it("should return Err when ledger service not initialized", async () => {
      const source = createWalletSource(false);
      const store = new WalletTxCartStore(source);
      // Don't call initialize()

      const result = await store.execute();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Ledger service is not initialized.");
      }
    });

    it("should transfer ICP to account ID", async () => {
      const source = createWalletSource(true, true);
      const store = new WalletTxCartStore(source);
      store.initialize();

      const result = await store.execute();

      expect(mockTransferToAccount).toHaveBeenCalledWith(
        source.to,
        source.amount,
      );
      expect(result).toEqual(Ok(12345n));
    });

    it("should transfer ICP to principal", async () => {
      const source = createWalletSource(true, false);
      const store = new WalletTxCartStore(source);
      store.initialize();

      const result = await store.execute();

      expect(mockIcpTransferToPrincipal).toHaveBeenCalledWith(
        source.to,
        source.amount,
      );
      expect(result).toEqual(Ok(11111n));
    });

    it("should transfer ICRC token to principal", async () => {
      const source = createWalletSource(false);
      const store = new WalletTxCartStore(source);
      store.initialize();

      const result = await store.execute();

      expect(mockTransferToPrincipal).toHaveBeenCalledWith(
        source.to,
        source.amount,
      );
      expect(result).toEqual(Ok(67890n));
    });

    it("should return Err for ICRC with account ID", async () => {
      const source = createWalletSource(false);
      source.receiveType = ReceiveAddressType.ACCOUNT_ID;
      const store = new WalletTxCartStore(source);
      store.initialize();

      const result = await store.execute();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("ICRC transfer only supports principal");
      }
    });

    it("should return Err when user not authenticated", async () => {
      vi.mocked(authState).account =
        null as unknown as typeof authState.account;
      const source = createWalletSource();
      const store = new WalletTxCartStore(source);

      const result = await store.execute();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("User is not authenticated.");
      }
    });
  });

  describe("state transitions", () => {
    const mockTokenAddress = "mxzaz-hqaaa-aaaar-qaada-cai";
    const mockToken: TokenWithPriceAndBalance = {
      address: mockTokenAddress,
      name: "Test Token",
      symbol: "TEST",
      decimals: 8,
      fee: 10_000n,
      enabled: true,
      is_default: false,
      balance: 10_000_000n,
      priceUSD: 10,
    };
    const mockTokens: Record<string, TokenWithPriceAndBalance> = {
      [mockTokenAddress]: mockToken,
    };

    it("should transition to SUCCEED on successful transfer", async () => {
      const source = createWalletSource(false);
      source.token = mockToken as TokenMetadata;
      const store = new WalletTxCartStore(source);
      store.initialize();
      store.initializeAssets(mockTokens);

      expect(store.assetAndFeeList[0].asset.state).toBe(
        AssetProcessState.CREATED,
      );

      const result = await store.execute();

      expect(result.isOk()).toBe(true);
      expect(store.assetAndFeeList[0].asset.state).toBe(
        AssetProcessState.SUCCEED,
      );
    });

    it("should transition to FAILED on transfer error", async () => {
      mockTransferToPrincipal.mockRejectedValueOnce(
        new Error("Transfer failed"),
      );

      const source = createWalletSource(false);
      source.token = mockToken as TokenMetadata;
      const store = new WalletTxCartStore(source);
      store.initialize();
      store.initializeAssets(mockTokens);

      const result = await store.execute();

      expect(result.isErr()).toBe(true);
      expect(store.assetAndFeeList[0].asset.state).toBe(
        AssetProcessState.FAILED,
      );
    });
  });
});
