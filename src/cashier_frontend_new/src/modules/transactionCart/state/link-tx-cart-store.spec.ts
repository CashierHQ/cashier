import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";
import type { ActionSource } from "$modules/transactionCart/types/transaction-source";
import { TransactionSourceType } from "$modules/transactionCart/types/transaction-source";
import type Action from "$modules/links/types/action/action";
import type { ProcessActionResult } from "$modules/links/types/action/action";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";

// Mock constants
const CASHIER_BACKEND_CANISTER_ID = "aaaaa-aa";

// Hoisted mock functions
const {
  mockSendBatchRequest,
  mockMapActionToAssetAndFeeList,
  mockGetSigner,
  MockIcrc112Service,
} = vi.hoisted(() => {
  const mockSendBatchRequest = vi.fn();
  return {
    mockSendBatchRequest,
    mockMapActionToAssetAndFeeList: vi.fn(),
    mockGetSigner: vi.fn(),
    MockIcrc112Service: vi.fn(() => ({
      sendBatchRequest: mockSendBatchRequest,
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

import { authState } from "$modules/auth/state/auth.svelte";
import Icrc112Service from "$modules/icrc112/services/icrc112Service";
import { LinkTxCartStore } from "./link-tx-cart-store.svelte";

// Test fixtures
function createMockAction(withIcrc112Requests = false): Action {
  return {
    id: "test-action-id",
    creator: Principal.fromText("aaaaa-aa"),
    type: "SEND",
    state: "CREATED",
    intents: [
      {
        id: "intent-1",
        type: "TRANSFER",
        state: "CREATED",
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

describe("LinkTxCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSigner.mockReturnValue({ mock: "signer" });
    mockSendBatchRequest.mockResolvedValue(undefined);
    vi.mocked(authState).account = {
      owner: "test-principal-id",
    } as typeof authState.account;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create store with ActionSource", () => {
      const source = createActionSource();
      const store = new LinkTxCartStore(source);
      expect(store).toBeInstanceOf(LinkTxCartStore);
    });
  });

  describe("initialize", () => {
    it("should initialize ICRC-112 service when signer available", () => {
      const source = createActionSource();
      const store = new LinkTxCartStore(source);

      store.initialize();

      expect(mockGetSigner).toHaveBeenCalled();
      expect(Icrc112Service).toHaveBeenCalled();
    });

    it("should not initialize ICRC-112 service when no signer", () => {
      mockGetSigner.mockReturnValueOnce(null);
      const source = createActionSource();
      const store = new LinkTxCartStore(source);

      store.initialize();

      expect(Icrc112Service).not.toHaveBeenCalled();
    });
  });

  describe("initializeAssets", () => {
    it("should populate assetAndFeeList from feeService", () => {
      const source = createActionSource();
      const store = new LinkTxCartStore(source);
      const mockAssets = [
        {
          asset: {
            state: AssetProcessState.CREATED,
            label: "",
            symbol: "ICP",
            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
            amount: 1_000_000n,
            amountFormattedStr: "0.01",
            usdValueStr: "$0.10",
            direction: "OUTGOING",
            intentId: "intent-1",
          },
          fee: null,
        },
      ];
      mockMapActionToAssetAndFeeList.mockReturnValue(mockAssets);

      store.initializeAssets({});

      expect(store.assetAndFeeList).toEqual(mockAssets);
    });
  });

  describe("computeFee", () => {
    it("should return total fee in USD", () => {
      const source = createActionSource();
      const store = new LinkTxCartStore(source);
      mockMapActionToAssetAndFeeList.mockReturnValue([
        {
          asset: { state: AssetProcessState.CREATED },
          fee: { usdValue: 0.01 },
        },
        {
          asset: { state: AssetProcessState.CREATED },
          fee: { usdValue: 0.02 },
        },
      ]);

      store.initializeAssets({});

      expect(store.computeFee()).toBeCloseTo(0.03);
    });
  });

  describe("execute", () => {
    it("should throw when ICRC-112 service not initialized", async () => {
      const source = createActionSource();
      const store = new LinkTxCartStore(source);
      // Don't call initialize()

      await expect(store.execute()).rejects.toThrow(
        "ICRC-112 Service is not initialized.",
      );
    });

    it("should execute action without ICRC-112 requests", async () => {
      const source = createActionSource(false);
      const store = new LinkTxCartStore(source);
      store.initialize();

      const result = await store.execute();

      expect(source.handleProcessAction).toHaveBeenCalled();
      expect(result.isSuccess).toBe(true);
    });

    it("should send batch request when ICRC-112 requests present", async () => {
      const source = createActionSource(true);
      const store = new LinkTxCartStore(source);
      store.initialize();

      await store.execute();

      expect(mockSendBatchRequest).toHaveBeenCalledWith(
        source.action.icrc_112_requests,
        "test-principal-id",
        CASHIER_BACKEND_CANISTER_ID,
      );
      expect(source.handleProcessAction).toHaveBeenCalled();
    });

    it("should throw error when user not authenticated", async () => {
      vi.mocked(authState).account =
        null as unknown as typeof authState.account;
      const source = createActionSource();
      const store = new LinkTxCartStore(source);

      await expect(store.execute()).rejects.toThrow(
        "User is not authenticated.",
      );
    });
  });

  describe("syncStatesFromAction", () => {
    it("should update asset states from action intents", () => {
      const source = createActionSource();
      const store = new LinkTxCartStore(source);
      mockMapActionToAssetAndFeeList.mockReturnValue([
        {
          asset: {
            state: AssetProcessState.CREATED,
            intentId: "intent-1",
            symbol: "ICP",
          },
          fee: null,
        },
      ]);
      store.initializeAssets({});

      const baseAction = createMockAction();
      const updatedAction: Action = {
        ...baseAction,
        intents: baseAction.intents?.map((intent) => ({
          ...intent,
          id: "intent-1",
          state: "SUCCESS",
        })),
      } as Action;

      store.syncStatesFromAction(updatedAction);

      expect(store.assetAndFeeList[0].asset.state).toBe(
        AssetProcessState.SUCCEED,
      );
    });
  });
});
