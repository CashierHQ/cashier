import { beforeEach, describe, expect, it, vi } from "vitest";
import { Err, Ok } from "ts-results-es";
import {
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import { BridgeAssetType } from "$modules/bitcoin/types/bridge_transaction";
import { RetrieveBtcStatusKind } from "$modules/bitcoin/types/ckbtc_minter";

const {
  mockManagedState,
  mockApproveCkBtcWithdrawal,
  mockGetAllowanceForCkBtcMinter,
  mockRetrieveBtcWithApproval,
  mockRetrieveBtcStatusV2ByAccount,
  mockGetBridgeTransactionById,
  mockGetBridgeTransactions,
  mockUpdateBridgeTransaction,
  MockIcrcLedgerService,
} = vi.hoisted(() => {
  const mockManagedState = vi.fn();
  const mockApproveCkBtcWithdrawal = vi.fn();
  const mockGetAllowanceForCkBtcMinter = vi.fn();
  const mockRetrieveBtcWithApproval = vi.fn();
  const mockRetrieveBtcStatusV2ByAccount = vi.fn();
  const mockGetBridgeTransactionById = vi.fn();
  const mockGetBridgeTransactions = vi.fn();
  const mockUpdateBridgeTransaction = vi.fn();

  const MockIcrcLedgerService = vi.fn(() => ({
    approveCkBtcWithdrawal: mockApproveCkBtcWithdrawal,
    getAllowanceForCkBtcMinter: mockGetAllowanceForCkBtcMinter,
  }));

  return {
    mockManagedState,
    mockApproveCkBtcWithdrawal,
    mockGetAllowanceForCkBtcMinter,
    mockRetrieveBtcWithApproval,
    mockRetrieveBtcStatusV2ByAccount,
    mockGetBridgeTransactionById,
    mockGetBridgeTransactions,
    mockUpdateBridgeTransaction,
    MockIcrcLedgerService,
  };
});

vi.mock("$lib/managedState", () => ({
  managedState: mockManagedState,
}));

vi.mock("$modules/token/services/icrcLedger", () => ({
  IcrcLedgerService: MockIcrcLedgerService,
}));

vi.mock("$modules/bitcoin/services/ckBTCMinterService", () => ({
  ckBTCMinterService: {
    retrieveBtcWithApproval: mockRetrieveBtcWithApproval,
    retrieveBtcStatusV2ByAccount: mockRetrieveBtcStatusV2ByAccount,
  },
}));

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    getBridgeTransactionById: mockGetBridgeTransactionById,
    getBridgeTransactions: mockGetBridgeTransactions,
    updateBridgeTransaction: mockUpdateBridgeTransaction,
  },
}));

vi.mock("$modules/token/state/tokenPriceStore.svelte", () => ({
  tokenPriceStore: {
    getTokenPriceByCanisterId: vi.fn(() => 0),
  },
}));

const fixture_of_bridge_transaction = (
  overrides: Partial<BridgeTransactionWithUsdValue> = {},
): BridgeTransactionWithUsdValue => ({
  bridge_id: "bridge_1",
  icp_address: "aaaaa-aa",
  btc_address: "tb1qreceiver",
  asset_infos: [
    {
      asset_type: BridgeAssetType.BTC,
      asset_id: "ckbtc",
      amount: 50_000n,
      decimals: 8,
    },
  ],
  bridge_type: BridgeType.Export,
  total_amount: 50_000n,
  total_amount_usd: 0,
  created_at_ts: 1_700_000_000n,
  deposit_fee: 0n,
  withdrawal_fee: 450n,
  btc_fee: 1000n,
  btc_txid: null,
  ckbtc_block_id: null,
  block_id: null,
  block_timestamp: null,
  confirmations: [],
  retry_times: 0,
  status: BridgeTransactionStatus.Created,
  ...overrides,
});

describe("BridgeTxCartStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    let currentBridgeTransaction = fixture_of_bridge_transaction();
    mockManagedState.mockImplementation(({ queryFn }) => ({
      data: currentBridgeTransaction,
      refresh: vi.fn(async () => {
        const result = await queryFn();
        currentBridgeTransaction = result;
        return result;
      }),
    }));

    mockGetBridgeTransactionById.mockResolvedValue(
      Ok(currentBridgeTransaction),
    );
    mockGetBridgeTransactions.mockResolvedValue([]);
    mockUpdateBridgeTransaction.mockResolvedValue(Ok(currentBridgeTransaction));
    mockApproveCkBtcWithdrawal.mockResolvedValue(10n);
    mockGetAllowanceForCkBtcMinter.mockResolvedValue(0n);
    mockRetrieveBtcWithApproval.mockResolvedValue(Ok(99n));
    mockRetrieveBtcStatusV2ByAccount.mockResolvedValue(Ok([]));
  });

  describe("executeExport", () => {
    it("should_update_export_bridge_to_pending_when_approve_and_retrieve_succeed", async () => {
      // Arrange
      const { BridgeTxCartStore } = await import("./bridgeTxCartStore.svelte");
      const store = new BridgeTxCartStore("bridge_1");

      // Act
      const result = await store.executeExport();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockApproveCkBtcWithdrawal).toHaveBeenCalled();
      expect(mockRetrieveBtcWithApproval).toHaveBeenCalledWith(
        "tb1qreceiver",
        50_000n,
      );
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "bridge_1",
        BridgeTransactionStatus.Pending,
        99n,
        null,
      );
    });

    it("should_update_export_bridge_to_pending_when_allowance_is_greater_than_or_equal_to_export_amount", async () => {
      // Arrange
      mockApproveCkBtcWithdrawal.mockRejectedValue(new Error("approve failed"));
      mockGetAllowanceForCkBtcMinter.mockResolvedValue(50_000n);
      const { BridgeTxCartStore } = await import("./bridgeTxCartStore.svelte");
      const store = new BridgeTxCartStore("bridge_1");

      // Act
      const result = await store.executeExport();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockRetrieveBtcWithApproval).toHaveBeenCalled();
    });

    it("should_update_export_bridge_to_pending_when_retrieve_fails_but_account_recovery_finds_unseen_block_index", async () => {
      // Arrange
      mockRetrieveBtcWithApproval.mockResolvedValue(Err("retrieve failed"));
      mockGetBridgeTransactions.mockResolvedValue([
        fixture_of_bridge_transaction({
          bridge_id: "bridge_existing",
          ckbtc_block_id: 4n,
          status: BridgeTransactionStatus.Pending,
        }),
      ]);
      mockRetrieveBtcStatusV2ByAccount.mockResolvedValue(
        Ok([
          {
            block_index: 4n,
            status_v2: { kind: RetrieveBtcStatusKind.Pending, txid: null },
          },
          {
            block_index: 9n,
            status_v2: { kind: RetrieveBtcStatusKind.Pending, txid: null },
          },
        ]),
      );
      const { BridgeTxCartStore } = await import("./bridgeTxCartStore.svelte");
      const store = new BridgeTxCartStore("bridge_1");

      // Act
      const result = await store.executeExport();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "bridge_1",
        BridgeTransactionStatus.Pending,
        9n,
        null,
      );
    });

    it("should_update_export_bridge_to_pending_using_latest_unseen_block_index_when_multiple_unseen_exist", async () => {
      // Arrange
      mockApproveCkBtcWithdrawal.mockRejectedValue(new Error("approve failed"));
      mockGetAllowanceForCkBtcMinter.mockResolvedValue(1n);
      mockRetrieveBtcStatusV2ByAccount.mockResolvedValue(
        Ok([
          {
            block_index: 5n,
            status_v2: { kind: RetrieveBtcStatusKind.Pending, txid: null },
          },
          {
            block_index: 8n,
            status_v2: { kind: RetrieveBtcStatusKind.Pending, txid: null },
          },
        ]),
      );
      const { BridgeTxCartStore } = await import("./bridgeTxCartStore.svelte");
      const store = new BridgeTxCartStore("bridge_1");

      // Act
      const result = await store.executeExport();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "bridge_1",
        BridgeTransactionStatus.Pending,
        8n,
        null,
      );
    });

    it("should_fail_export_bridge_when_recovery_finds_no_unseen_block_index", async () => {
      // Arrange
      mockApproveCkBtcWithdrawal.mockRejectedValue(new Error("approve failed"));
      mockGetAllowanceForCkBtcMinter.mockResolvedValue(1n);
      const { BridgeTxCartStore } = await import("./bridgeTxCartStore.svelte");
      const store = new BridgeTxCartStore("bridge_1");

      // Act
      const result = await store.executeExport();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "bridge_1",
        BridgeTransactionStatus.Failed,
      );
    });
  });
});
