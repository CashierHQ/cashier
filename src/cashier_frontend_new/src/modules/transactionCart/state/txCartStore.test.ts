import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";
import {
  type ActionSource,
  type WalletSource,
  TransactionSourceType,
  FlowDirection,
} from "$modules/transactionCart/types/transaction-source";
import type {
  TokenMetadata,
  TokenWithPriceAndBalance,
} from "$modules/token/types";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { ReceiveAddressType } from "$modules/wallet/types";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import { FeeType } from "$modules/links/types/fee";

// Mock constants
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const CASHIER_BACKEND_CANISTER_ID = "aaaaa-aa";

// Hoisted mock functions (required for vi.mock factory functions)
const {
  mockSendBatchRequest,
  mockTransferToAccount,
  mockTransferToPrincipal,
  mockMapActionToAssetAndFeeList,
  mockGetSigner,
  MockIcrc112Service,
  MockIcpLedgerService,
  MockIcrcLedgerService,
} = vi.hoisted(() => {
  const mockSendBatchRequest = vi.fn();
  const mockTransferToAccount = vi.fn();
  const mockTransferToPrincipal = vi.fn();

  return {
    mockSendBatchRequest,
    mockTransferToAccount,
    mockTransferToPrincipal,
    mockMapActionToAssetAndFeeList: vi.fn(),
    mockGetSigner: vi.fn(),
    MockIcrc112Service: vi.fn(() => ({
      sendBatchRequest: mockSendBatchRequest,
    })),
    MockIcpLedgerService: vi.fn(() => ({
      transferToAccount: mockTransferToAccount,
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
    getSigner: mockGetSigner,
  },
}));

vi.mock("$modules/icrc112/services/icrc112Service", () => ({
  default: MockIcrc112Service,
}));

vi.mock("$modules/shared/constants", () => ({
  CASHIER_BACKEND_CANISTER_ID: "aaaaa-aa",
}));

vi.mock("$modules/shared/services/feeService", () => ({
  feeService: {
    mapActionToAssetAndFeeList: mockMapActionToAssetAndFeeList,
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

// Import mocked modules after vi.mock
import { authState } from "$modules/auth/state/auth.svelte";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";
import { IcpLedgerService } from "$modules/token/services/icpLedger";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";

// Import TransactionCartStore AFTER mocks are set up
import { TransactionCartStore } from "./txCartStore.svelte";

// Test fixtures
function createMockAction(withIcrc112Requests = false): Action {
  return {
    id: "test-action-id",
    creator: Principal.fromText("aaaaa-aa"),
    type: "SEND",
    state: "CREATED",
    intents: [
      {
        type: "TRANSFER",
        payload: {
          amount: 1_000_000n,
          token: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        },
      },
    ],
    icrc_112_requests: withIcrc112Requests
      ? [
          [
            {
              canister_id: Principal.fromText("aaaaa-aa"),
              method: "test",
              arg: new ArrayBuffer(0),
            },
          ],
        ]
      : undefined,
  } as unknown as Action;
}

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

function createActionSource(withIcrc112Requests = false): ActionSource {
  return {
    type: TransactionSourceType.ACTION,
    action: createMockAction(withIcrc112Requests),
    handleProcessAction: vi.fn().mockResolvedValue({
      action: createMockAction(),
      isSuccess: true,
      errors: [],
    } as ProcessActionResult),
  };
}

function createWalletSource(
  isIcp = false,
  withAccountId = false,
): WalletSource {
  return {
    type: TransactionSourceType.WALLET,
    token: createMockToken(isIcp),
    to: Principal.fromText("aaaaa-aa"),
    toAccountId: withAccountId ? "abc123def456" : undefined,
    amount: 1_000_000n,
    receiveType: ReceiveAddressType.PRINCIPAL,
  };
}

describe("TransactionCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock return values
    mockGetSigner.mockReturnValue({ mock: "signer" });
    mockSendBatchRequest.mockResolvedValue(undefined);
    mockTransferToAccount.mockResolvedValue(12345n);
    mockTransferToPrincipal.mockResolvedValue(67890n);
    // Reset authState account
    vi.mocked(authState).account = {
      owner: "test-principal-id",
    } as typeof authState.account;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // Constructor & Type Discrimination
  // ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("should create store with ActionSource", () => {
      const source = createActionSource();
      const store = new TransactionCartStore(source);
      expect(store).toBeInstanceOf(TransactionCartStore);
    });

    it("should create store with WalletSource", () => {
      const source = createWalletSource();
      const store = new TransactionCartStore(source);
      expect(store).toBeInstanceOf(TransactionCartStore);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // initialize()
  // ─────────────────────────────────────────────────────────────

  describe("initialize", () => {
    it("should initialize ICRC-112 service for ActionSource when signer available", () => {
      const source = createActionSource();
      const store = new TransactionCartStore(source);

      store.initialize();

      expect(mockGetSigner).toHaveBeenCalled();
      expect(Icrc112Service).toHaveBeenCalled();
    });

    it("should not initialize ICRC-112 service when no signer", () => {
      mockGetSigner.mockReturnValueOnce(null);
      const source = createActionSource();
      const store = new TransactionCartStore(source);

      store.initialize();

      expect(Icrc112Service).not.toHaveBeenCalled();
    });

    it("should initialize IcpLedgerService for WalletSource with ICP token", () => {
      const source = createWalletSource(true); // ICP token
      const store = new TransactionCartStore(source);

      store.initialize();

      expect(IcpLedgerService).toHaveBeenCalled();
      expect(IcrcLedgerService).not.toHaveBeenCalled();
    });

    it("should initialize IcrcLedgerService for WalletSource with ICRC token", () => {
      const source = createWalletSource(false); // Non-ICP token
      const store = new TransactionCartStore(source);

      store.initialize();

      expect(IcrcLedgerService).toHaveBeenCalledWith(source.token);
      expect(IcpLedgerService).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // computeFee()
  // ─────────────────────────────────────────────────────────────

  describe("computeFee", () => {
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

    it("should return AssetAndFee[] for ActionSource", () => {
      const source = createActionSource();
      const store = new TransactionCartStore(source);
      const mockAssetAndFee: AssetAndFee[] = [
        {
          asset: {
            state: AssetProcessState.PENDING,
            label: "",
            symbol: "TEST",
            address: mockTokenAddress,
            amount: 1_010_000n,
            amountFormattedStr: "0.0101",
            usdValueStr: "$0.10",
            direction: FlowDirection.OUTGOING,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: 10_000n,
            amountFormattedStr: "0.0001",
            symbol: "TEST",
            usdValue: 0.001,
          },
        },
      ];
      mockMapActionToAssetAndFeeList.mockReturnValue(mockAssetAndFee);

      const result = store.computeAssetAndFee(mockTokens);

      expect(mockMapActionToAssetAndFeeList).toHaveBeenCalledWith(
        source.action,
        mockTokens,
        "test-principal-id",
      );
      expect(result).toEqual(mockAssetAndFee);
    });

    it("should return AssetAndFee[] for WalletSource", () => {
      const source = createWalletSource(false);
      source.token = mockToken as TokenMetadata;
      const store = new TransactionCartStore(source);

      const result = store.computeAssetAndFee(mockTokens);

      expect(result.length).toBe(1);
      expect(result[0].asset.symbol).toBe("TEST");
      expect(result[0].asset.direction).toBe(FlowDirection.OUTGOING);
      expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
    });

    it("should return empty array for WalletSource when token not in map", () => {
      const source = createWalletSource(false);
      source.token.address = "unknown-token";
      const store = new TransactionCartStore(source);

      const result = store.computeAssetAndFee(mockTokens);

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // execute()
  // ─────────────────────────────────────────────────────────────

  describe("execute", () => {
    it("should throw error when user is not authenticated", async () => {
      vi.mocked(authState).account =
        null as unknown as typeof authState.account;
      const source = createActionSource();
      const store = new TransactionCartStore(source);

      await expect(store.execute()).rejects.toThrow(
        "User is not authenticated.",
      );
    });

    describe("ActionSource execution", () => {
      it("should throw when ICRC-112 service not initialized", async () => {
        const source = createActionSource();
        const store = new TransactionCartStore(source);
        // Don't call initialize()

        await expect(store.execute()).rejects.toThrow(
          "ICRC-112 Service is not initialized.",
        );
      });

      it("should execute action without ICRC-112 requests", async () => {
        const source = createActionSource(false);
        const store = new TransactionCartStore(source);
        store.initialize();

        const result = await store.execute();

        expect(source.handleProcessAction).toHaveBeenCalled();
        expect(result.isSuccess).toBe(true);
      });

      it("should send batch request when ICRC-112 requests present", async () => {
        const source = createActionSource(true);
        const store = new TransactionCartStore(source);
        store.initialize();

        await store.execute();

        expect(mockSendBatchRequest).toHaveBeenCalledWith(
          source.action.icrc_112_requests,
          "test-principal-id",
          CASHIER_BACKEND_CANISTER_ID,
        );
        expect(source.handleProcessAction).toHaveBeenCalled();
      });
    });

    describe("WalletSource execution", () => {
      it("should throw when ICRC ledger service not initialized", async () => {
        const source = createWalletSource(false);
        const store = new TransactionCartStore(source);
        // Don't call initialize()

        await expect(store.execute()).rejects.toThrow(
          "ICRC Ledger Service is not initialized.",
        );
      });

      it("should transfer ICP to account ID when ICP token and accountId provided", async () => {
        const source = createWalletSource(true, true); // ICP with accountId
        const store = new TransactionCartStore(source);
        store.initialize();

        const result = await store.execute();

        expect(mockTransferToAccount).toHaveBeenCalledWith(
          source.toAccountId,
          source.amount,
        );
        expect(result).toBe(12345n);
      });

      it("should transfer ICRC token to principal", async () => {
        const source = createWalletSource(false);
        const store = new TransactionCartStore(source);
        store.initialize();

        const result = await store.execute();

        expect(mockTransferToPrincipal).toHaveBeenCalledWith(
          source.to,
          source.amount,
        );
        expect(result).toBe(67890n);
      });
    });
  });
});
