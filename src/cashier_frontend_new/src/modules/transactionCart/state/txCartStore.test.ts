import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";
import {
  type ActionSource,
  type WalletSource,
  TransactionSourceType,
  FlowDirection,
  FlowDirectionError,
} from "../types/transaction-source";
import type { TokenMetadata, TokenWithPriceAndBalance } from "$modules/token/types";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { ReceiveAddressType } from "$modules/wallet/types";
import type { AssetAndFee } from "$modules/shared/types/feeService";
import { AssetProcessState } from "../types/txCart";
import { FeeType } from "$modules/links/types/fee";

// Mock constants
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const CASHIER_BACKEND_CANISTER_ID = "aaaaa-aa";

// Hoisted mock functions (required for vi.mock factory functions)
const {
  mockSendBatchRequest,
  mockTransferToAccount,
  mockTransferToPrincipal,
  mockComputeAmountAndFee,
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
    mockComputeAmountAndFee: vi.fn(),
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
    computeAmountAndFee: mockComputeAmountAndFee,
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
    icrc_112_requests: withIcrc112Requests ? [[{ canister_id: Principal.fromText("aaaaa-aa"), method: "test", arg: new ArrayBuffer(0) }]] : undefined,
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

function createWalletSource(isIcp = false, withAccountId = false): WalletSource {
  return {
    type: TransactionSourceType.WALLET,
    token: createMockToken(isIcp),
    to: Principal.fromText("aaaaa-aa"),
    toAccountId: withAccountId ? "abc123def456" : undefined,
    amount: 1_000_000n,
    receiveType: ReceiveAddressType.PRINCIPAL,
  };
}

// Helper to create action with configurable from/to principals for flow direction tests
function createMockActionWithIntents(
  fromPrincipal: string,
  toPrincipal: string,
): Action {
  const fromWallet = {
    address: { toText: () => fromPrincipal },
    subaccount: null,
  };
  const toWallet = {
    address: { toText: () => toPrincipal },
    subaccount: null,
  };

  return {
    id: "test-action-id",
    creator: Principal.fromText("aaaaa-aa"),
    type: "SEND",
    state: "CREATED",
    intents: [
      {
        id: "intent-1",
        task: {},
        type: {
          payload: {
            from: fromWallet,
            to: toWallet,
            asset: {},
            amount: 1_000_000n,
          },
        },
        created_at: 0n,
        state: {},
      },
    ],
    icrc_112_requests: undefined,
  } as unknown as Action;
}

describe("TransactionCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock return values
    mockGetSigner.mockReturnValue({ mock: "signer" });
    mockSendBatchRequest.mockResolvedValue(undefined);
    mockTransferToAccount.mockResolvedValue(12345n);
    mockTransferToPrincipal.mockResolvedValue(67890n);
    mockComputeAmountAndFee.mockReturnValue({
      amount: 1_010_000n,
      fee: 10_000n,
    });
    // Reset authState account
    vi.mocked(authState).account = { owner: "test-principal-id" } as typeof authState.account;
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
    it("should compute fee for ActionSource using feeService", () => {
      const source = createActionSource();
      const store = new TransactionCartStore(source);

      const result = store.computeFee();

      expect(mockComputeAmountAndFee).toHaveBeenCalledWith({
        intent: source.action.intents[0],
        ledgerFee: 10_000n,
        actionType: source.action.type,
      });
      expect(result).toEqual({ amount: 1_010_000n, fee: 10_000n });
    });

    it("should return zero amount when ActionSource has no intents", () => {
      const source = createActionSource();
      // Create source with empty intents via mock
      const emptyIntentsSource: ActionSource = {
        ...source,
        action: {
          ...source.action,
          intents: [],
        } as unknown as Action,
      };
      const store = new TransactionCartStore(emptyIntentsSource);

      const result = store.computeFee();

      expect(result).toEqual({ amount: 0n, fee: undefined });
    });

    it("should compute fee for WalletSource from token fee", () => {
      const source = createWalletSource();
      const store = new TransactionCartStore(source);

      const result = store.computeFee();

      expect(result).toEqual({
        amount: 1_000_000n + 10_000n, // amount + fee
        fee: 10_000n,
      });
    });

    it("should use default fee when token fee is undefined", () => {
      const source = createWalletSource();
      source.token.fee = undefined as unknown as bigint;
      const store = new TransactionCartStore(source);

      const result = store.computeFee();

      expect(result.fee).toBe(10_000n); // default fee
    });
  });

  // ─────────────────────────────────────────────────────────────
  // execute()
  // ─────────────────────────────────────────────────────────────

  describe("execute", () => {
    it("should throw error when user is not authenticated", async () => {
      vi.mocked(authState).account = null as unknown as typeof authState.account;
      const source = createActionSource();
      const store = new TransactionCartStore(source);

      await expect(store.execute()).rejects.toThrow("User is not authenticated.");
    });

    describe("ActionSource execution", () => {
      it("should throw when ICRC-112 service not initialized", async () => {
        const source = createActionSource();
        const store = new TransactionCartStore(source);
        // Don't call initialize()

        await expect(store.execute()).rejects.toThrow("ICRC-112 Service is not initialized.");
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

        await expect(store.execute()).rejects.toThrow("ICRC Ledger Service is not initialized.");
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

  // ─────────────────────────────────────────────────────────────
  // getFlowDirection()
  // ─────────────────────────────────────────────────────────────

  describe("getFlowDirection", () => {
    describe("ActionSource", () => {
      it("should return Ok(INCOMING) when to.address matches wallet principal", () => {
        const action = createMockActionWithIntents(
          "other-principal",
          "test-principal-id" // matches authState.account.owner
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getFlowDirection();
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(FlowDirection.INCOMING);
      });

      it("should return Ok(OUTGOING) when from.address matches wallet principal", () => {
        const action = createMockActionWithIntents(
          "test-principal-id", // matches authState.account.owner
          "other-principal"
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getFlowDirection();
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(FlowDirection.OUTGOING);
      });

      it("should return Ok(OUTGOING) when neither address matches", () => {
        const action = createMockActionWithIntents(
          "other-principal-1",
          "other-principal-2"
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getFlowDirection();
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(FlowDirection.OUTGOING);
      });

      it("should return Err(NO_INTENT) when no intents", () => {
        const source = createActionSource();
        source.action = {
          ...source.action,
          intents: [],
        } as unknown as Action;
        const store = new TransactionCartStore(source);

        const result = store.getFlowDirection();
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(FlowDirectionError.NO_INTENT);
      });

      it("should return Err(NOT_AUTHENTICATED) when user not authenticated", () => {
        vi.mocked(authState).account = null as unknown as typeof authState.account;
        const action = createMockActionWithIntents(
          "other-principal",
          "test-principal-id"
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getFlowDirection();
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe(FlowDirectionError.NOT_AUTHENTICATED);
      });
    });

    describe("WalletSource", () => {
      it("should always return Ok(OUTGOING)", () => {
        const source = createWalletSource();
        const store = new TransactionCartStore(source);

        const result = store.getFlowDirection();
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(FlowDirection.OUTGOING);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getOutgoingAssets(), getIncomingAssets(), getTotalFeeUsd()
  // ─────────────────────────────────────────────────────────────

  describe("getOutgoingAssets", () => {
    const mockTokens: Record<string, TokenWithPriceAndBalance> = {
      "ryjl3-tyaaa-aaaaa-aaaba-cai": {
        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        name: "Internet Computer",
        symbol: "ICP",
        decimals: 8,
        fee: 10_000n,
        enabled: true,
        is_default: true,
        balance: 100_000_000n,
        priceUSD: 10.0,
      },
      "mxzaz-hqaaa-aaaar-qaada-cai": {
        address: "mxzaz-hqaaa-aaaar-qaada-cai",
        name: "Test Token",
        symbol: "TEST",
        decimals: 8,
        fee: 10_000n,
        enabled: true,
        is_default: false,
        balance: 50_000_000n,
        priceUSD: 5.0,
      },
    };

    const mockAssetAndFee: AssetAndFee[] = [
      {
        asset: {
          state: AssetProcessState.PENDING,
          label: "",
          symbol: "ICP",
          address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
          amount: 1_010_000n,
          amountFormattedStr: "0.0101",
          usdValueStr: "$0.10",
        },
        fee: {
          feeType: FeeType.NETWORK_FEE,
          amount: 10_000n,
          amountFormattedStr: "0.0001",
          symbol: "ICP",
          usdValue: 0.001,
        },
      },
    ];

    beforeEach(() => {
      mockMapActionToAssetAndFeeList.mockReturnValue(mockAssetAndFee);
    });

    describe("ActionSource", () => {
      it("should return assets from feeService for outgoing flow", () => {
        const action = createMockActionWithIntents(
          "test-principal-id", // from == wallet => outgoing
          "other-principal"
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getOutgoingAssets(mockTokens);

        expect(mockMapActionToAssetAndFeeList).toHaveBeenCalledWith(action, mockTokens);
        expect(result).toEqual(mockAssetAndFee);
      });

      it("should return empty array for incoming flow", () => {
        const action = createMockActionWithIntents(
          "other-principal",
          "test-principal-id" // to == wallet => incoming
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getOutgoingAssets(mockTokens);

        expect(mockMapActionToAssetAndFeeList).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });

    describe("WalletSource", () => {
      it("should build asset list from wallet source", () => {
        const source = createWalletSource(false);
        source.token = mockTokens["mxzaz-hqaaa-aaaar-qaada-cai"] as TokenMetadata;
        const store = new TransactionCartStore(source);

        const result = store.getOutgoingAssets(mockTokens);

        expect(result.length).toBe(1);
        expect(result[0].asset.symbol).toBe("TEST");
        expect(result[0].asset.state).toBe(AssetProcessState.PENDING);
        expect(result[0].fee?.feeType).toBe(FeeType.NETWORK_FEE);
      });

      it("should return empty array when token not in tokens map", () => {
        const source = createWalletSource(false);
        source.token.address = "unknown-token-address";
        const store = new TransactionCartStore(source);

        const result = store.getOutgoingAssets(mockTokens);

        expect(result).toEqual([]);
      });
    });
  });

  describe("getIncomingAssets", () => {
    const mockTokens: Record<string, TokenWithPriceAndBalance> = {
      "ryjl3-tyaaa-aaaaa-aaaba-cai": {
        address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
        name: "Internet Computer",
        symbol: "ICP",
        decimals: 8,
        fee: 10_000n,
        enabled: true,
        is_default: true,
        balance: 100_000_000n,
        priceUSD: 10.0,
      },
    };

    const mockAssetAndFee: AssetAndFee[] = [
      {
        asset: {
          state: AssetProcessState.PENDING,
          label: "",
          symbol: "ICP",
          address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
          amount: 1_000_000n,
          amountFormattedStr: "0.01",
          usdValueStr: "$0.10",
        },
      },
    ];

    beforeEach(() => {
      mockMapActionToAssetAndFeeList.mockReturnValue(mockAssetAndFee);
    });

    describe("ActionSource", () => {
      it("should return assets from feeService for incoming flow", () => {
        const action = createMockActionWithIntents(
          "other-principal",
          "test-principal-id" // to == wallet => incoming
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getIncomingAssets(mockTokens);

        expect(mockMapActionToAssetAndFeeList).toHaveBeenCalledWith(action, mockTokens);
        expect(result).toEqual(mockAssetAndFee);
      });

      it("should return empty array for outgoing flow", () => {
        const action = createMockActionWithIntents(
          "test-principal-id", // from == wallet => outgoing
          "other-principal"
        );
        const source: ActionSource = {
          type: TransactionSourceType.ACTION,
          action,
          handleProcessAction: vi.fn(),
        };
        const store = new TransactionCartStore(source);

        const result = store.getIncomingAssets(mockTokens);

        expect(result).toEqual([]);
      });
    });

    describe("WalletSource", () => {
      it("should always return empty array (wallet transfers are never incoming)", () => {
        const source = createWalletSource();
        const store = new TransactionCartStore(source);

        const result = store.getIncomingAssets(mockTokens);

        expect(result).toEqual([]);
      });
    });
  });
});
