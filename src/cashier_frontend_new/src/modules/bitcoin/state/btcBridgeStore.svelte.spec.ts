import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransaction,
} from "$modules/bitcoin/types/bridge_transaction";
import {
  RetrieveBtcStatusKind,
  type MinterInfo,
} from "$modules/bitcoin/types/ckbtc_minter";
import { Err, Ok } from "ts-results-es";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function fixture_of_import_bridge(
  overrides: Partial<BridgeTransaction> = {},
): BridgeTransaction {
  return {
    bridge_id: "import_abc123",
    icp_address: "aaaaa-aa",
    btc_address: "tb1qreceiver",
    asset_infos: [
      { asset_type: "BTC", asset_id: "UTXO", amount: 50_000n, decimals: 8 },
    ],
    bridge_type: BridgeType.Import,
    total_amount: 49_000n,
    created_at_ts: 1_704_067_200n,
    deposit_fee: 1_000n,
    withdrawal_fee: 0n,
    btc_fee: 0n,
    btc_txid: "abc123",
    ckbtc_block_id: null,
    block_id: null,
    block_timestamp: null,
    confirmations: [],
    omnity_ticket_id: null,
    vin: [],
    vout: [],
    retry_times: 0,
    status: BridgeTransactionStatus.Pending,
    ...overrides,
  };
}

function fixture_of_export_bridge(
  overrides: Partial<BridgeTransaction> = {},
): BridgeTransaction {
  return {
    bridge_id: "export_def456",
    icp_address: "aaaaa-aa",
    btc_address: "tb1qsender",
    asset_infos: [
      { asset_type: "BTC", asset_id: "UTXO", amount: 50_000n, decimals: 8 },
    ],
    bridge_type: BridgeType.Export,
    total_amount: 49_000n,
    created_at_ts: 1_704_067_200n,
    deposit_fee: 0n,
    withdrawal_fee: 500n,
    btc_fee: 500n,
    btc_txid: null,
    ckbtc_block_id: 42n,
    block_id: null,
    block_timestamp: null,
    confirmations: [],
    omnity_ticket_id: null,
    vin: [],
    vout: [],
    retry_times: 0,
    status: BridgeTransactionStatus.Pending,
    ...overrides,
  };
}

function fixture_of_minted_utxo_info(overrides: Record<string, unknown> = {}) {
  return {
    blockIndex: 123n,
    mintedAmount: 50_000n,
    btcTxid: "deadbeef",
    btcHeight: 840_000,
    ...overrides,
  };
}

function fixture_of_minter_info(
  overrides: Partial<MinterInfo> = {},
): MinterInfo {
  return {
    kyt_fee: 2_000n,
    retrieve_btc_min_amount: 10_000n,
    min_confirmations: 6,
    ...overrides,
  };
}

function fixture_of_bitcoin_transaction(
  overrides: Record<string, unknown> = {},
) {
  return {
    txid: "abc123",
    sender: "tb1qsender",
    is_confirmed: true,
    block_id: 840_000n,
    block_timestamp: 1_704_000_000n,
    vout: [{ address: "tb1qreceiver", value: 50_000n }],
    ...overrides,
  };
}

function fixture_of_confirming_blocks(
  startHeight: number,
  count: number,
): BitcoinBlock[] {
  return Array.from({ length: count }, (_, i) => ({
    block_id: BigInt(startHeight + i),
    block_timestamp: BigInt(1_704_000_000 + i * 600),
  }));
}

// Hoist mock functions so they are available inside vi.mock factories
const {
  mockGetBtcAddress,
  mockGetRuneAddress,
  mockGetBridgeTransactions,
  mockUpdateBridgeTransaction,
  mockCreateManualImportBridgeTransaction,
  mockCreateImportBridgeTransaction,
  mockCreateRuneImportBridgeTransaction,
  mockGetMinterInfo,
  mockGetDepositFee,
  mockUpdateBalanceWithMintedInfo,
  mockRetrieveBtcStatusV2,
  mockGetMempoolTxs,
  mockGetTransactionById,
  mockGetAddressUtxos,
  mockGetTipHeight,
  mockGetLatestBlocksFromHeight,
  mockGenerateTicket,
  mockGenerateTicketStatus,
  mockGetRuneBalancesForOutputs,
  mockQueryInstances,
  mockPersistedValues,
  authAccountRef,
} = vi.hoisted(() => {
  type MockQuery = {
    data: unknown;
    refresh: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    refreshAsync: ReturnType<typeof vi.fn>;
  };
  return {
    mockGetBtcAddress: vi.fn(),
    mockGetRuneAddress: vi.fn(),
    mockGetBridgeTransactions: vi.fn(),
    mockUpdateBridgeTransaction: vi.fn(),
    mockCreateManualImportBridgeTransaction: vi.fn(),
    mockCreateImportBridgeTransaction: vi.fn(),
    mockCreateRuneImportBridgeTransaction: vi.fn(),
    mockGetMinterInfo: vi.fn(),
    mockGetDepositFee: vi.fn(),
    mockUpdateBalanceWithMintedInfo: vi.fn(),
    mockRetrieveBtcStatusV2: vi.fn(),
    mockGetMempoolTxs: vi.fn(),
    mockGetTransactionById: vi.fn(),
    mockGetAddressUtxos: vi.fn(),
    mockGetTipHeight: vi.fn(),
    mockGetLatestBlocksFromHeight: vi.fn(),
    mockGenerateTicket: vi.fn(),
    mockGenerateTicketStatus: vi.fn(),
    mockGetRuneBalancesForOutputs: vi.fn(),
    // Order in constructor: [0] bridgeTxQuery, [1] importBridgeTxQuery,
    //                        [2] exportBridgeTxQuery, [3] mempoolTxQuery
    mockQueryInstances: [] as MockQuery[],
    mockPersistedValues: {} as Record<string, unknown>,
    // Ref object so the getter closure captures it before `let` is initialized
    authAccountRef: { value: null as { owner: string } | null },
  };
});

vi.mock("$modules/bitcoin/constants", () => ({
  BRIDGE_PAGE_SIZE: 10,
  CKBTC_UPDATE_BALANCE_MAX_RETRY_TIMES: 3,
  MEMPOOL_API_POOLING_INTERVAL_SECONDS: 60,
  MEMPOOL_API_BASE_URLS: ["https://mempool.space/api"],
  CKBTC_MINTER_CANISTER_ID: "aaaaa-aa",
}));

vi.mock("$modules/token/constants", () => ({
  CKBTC_CANISTER_ID: "mxzaz-hqaaa-aaaar-qaada-cai",
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ICP_LEDGER_FEE: 10_000n,
}));

vi.mock("$modules/shared/constants", () => ({
  TOKEN_STORAGE_CANISTER_ID: "aaaaa-aa",
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    get account() {
      return authAccountRef.value;
    },
  },
}));

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    getBtcAddress: mockGetBtcAddress,
    getRuneAddress: mockGetRuneAddress,
    getBridgeTransactions: mockGetBridgeTransactions,
    updateBridgeTransaction: mockUpdateBridgeTransaction,
    createManualImportBridgeTransaction:
      mockCreateManualImportBridgeTransaction,
    createImportBridgeTransaction: mockCreateImportBridgeTransaction,
    createRuneImportBridgeTransaction: mockCreateRuneImportBridgeTransaction,
    getBridgeTransactionById: vi.fn(),
  },
}));

vi.mock("$modules/bitcoin/services/ckBTCMinterService", () => ({
  ckBTCMinterService: {
    getMinterInfo: mockGetMinterInfo,
    getDepositFee: mockGetDepositFee,
    updateBalanceWithMintedInfo: mockUpdateBalanceWithMintedInfo,
    retrieveBtcStatusV2: mockRetrieveBtcStatusV2,
    retrieveBtcStatusV2ByAccount: vi.fn().mockResolvedValue(Ok([])),
  },
}));

vi.mock("$modules/bitcoin/services/mempoolService", () => ({
  mempoolService: {
    getMempoolTxs: mockGetMempoolTxs,
    getTransactionById: mockGetTransactionById,
    getAddressUtxos: mockGetAddressUtxos,
    getTipHeight: mockGetTipHeight,
    getLatestBlocksFromHeight: mockGetLatestBlocksFromHeight,
  },
}));

vi.mock("$modules/bitcoin/services/omnityBitcoinService", () => ({
  omnityBitcoinService: {
    generateTicket: mockGenerateTicket,
    generateTicketStatus: mockGenerateTicketStatus,
  },
}));

vi.mock("$modules/bitcoin/services/omnityRunesIndexerService", () => ({
  omnityRunesIndexerService: {
    getRuneBalancesForOutputs: mockGetRuneBalancesForOutputs,
  },
}));

vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: {
    query: { data: [] },
  },
}));

vi.mock("$modules/token/state/tokenPriceStore.svelte", () => ({
  tokenPriceStore: { getTokenPriceByCanisterId: vi.fn().mockReturnValue(null) },
}));

vi.mock("$modules/bitcoin/utils", () => ({
  enrichBridgeTransactionWithUsdValue: vi
    .fn()
    .mockImplementation((txs: BridgeTransaction[]) =>
      txs.map((tx) => ({ ...tx, total_amount_usd: 0 })),
    ),
  groupBridgeTransactionsByDate: vi.fn().mockReturnValue([]),
  mapRetrieveBtcStatus: vi
    .fn()
    .mockReturnValue({ kind: "Unknown", txid: null }),
}));

// managedState mock — returns a controllable instance per call, stored in mockQueryInstances
vi.mock("$lib/managedState", () => ({
  managedState: vi.fn().mockImplementation(() => {
    const instance = {
      data: null as unknown,
      refresh: vi.fn(),
      reset: vi.fn(),
      refreshAsync: vi.fn(),
    };
    mockQueryInstances.push(instance);
    return instance;
  }),
}));

// PersistedState mock — allows tests to directly manipulate persisted values via mockPersistedValues
vi.mock("runed", () => ({
  PersistedState: vi
    .fn()
    .mockImplementation((key: string, defaultValue: unknown) => {
      mockPersistedValues[key] = defaultValue;
      return {
        get current() {
          return mockPersistedValues[key];
        },
        set current(v: unknown) {
          mockPersistedValues[key] = v;
        },
      };
    }),
}));

// Import store after all mocks are in place
import { btcBridgeStore } from "./btcBridgeStore.svelte";

describe("BridgeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authAccountRef.value = null;
    mockPersistedValues["btcAddress"] = null;
    mockPersistedValues["ckbtcMinterMinConfirmations"] = null;
    for (const q of mockQueryInstances) {
      q.data = null;
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchBtcAddress", () => {
    it("it_should_fail_fetch_btc_address_due_to_service_error", async () => {
      // Arrange
      mockGetBtcAddress.mockResolvedValue(Err("Minter error"));

      // Act
      const result = await btcBridgeStore.fetchBtcAddress();

      // Assert
      expect(result).toBeNull();
    });

    it("it_should_fetch_btc_address", async () => {
      // Arrange
      mockGetBtcAddress.mockResolvedValue(Ok("tb1qreceiver"));

      // Act
      const result = await btcBridgeStore.fetchBtcAddress();

      // Assert
      expect(result).toBe("tb1qreceiver");
    });
  });

  describe("fetchMinterInfo", () => {
    it("it_should_fail_fetch_minter_info_due_to_service_error", async () => {
      // Arrange
      mockGetMinterInfo.mockRejectedValue(new Error("Canister unreachable"));

      // Act
      const result = await btcBridgeStore.fetchMinterInfo();

      // Assert
      expect(result).toBeNull();
    });

    it("it_should_fetch_minter_info", async () => {
      // Arrange
      const minterInfo = fixture_of_minter_info();
      mockGetMinterInfo.mockResolvedValue(minterInfo);

      // Act
      const result = await btcBridgeStore.fetchMinterInfo();

      // Assert
      expect(result).toEqual(minterInfo);
    });
  });

  describe("lookupMempoolTransactionByAddress", () => {
    it("it_should_fail_lookup_mempool_transaction_due_to_mempool_error", async () => {
      // Arrange
      mockGetMempoolTxs.mockResolvedValue(Err("Network error"));

      // Act
      const result =
        await btcBridgeStore.lookupMempoolTransactionByAddress("tb1qreceiver");

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Get mempool tx IDs failed");
    });

    it("it_should_return_empty_when_no_txs_match_address", async () => {
      // Arrange
      mockGetMempoolTxs.mockResolvedValue(Ok(["txid1"]));
      mockGetTransactionById.mockResolvedValue(
        Ok(
          fixture_of_bitcoin_transaction({
            vout: [{ address: "tb1qother", value: 50_000n }],
          }),
        ),
      );

      // Act
      const result =
        await btcBridgeStore.lookupMempoolTransactionByAddress("tb1qreceiver");

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    it("it_should_return_txs_matching_address", async () => {
      // Arrange
      mockGetMempoolTxs.mockResolvedValue(Ok(["txid1"]));
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
      );

      // Act
      const result =
        await btcBridgeStore.lookupMempoolTransactionByAddress("tb1qreceiver");

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(1);
      expect(result.unwrap()[0].txid).toBe("abc123");
    });
  });

  describe("isMempoolTxProcessed", () => {
    it("it_should_return_false_when_bridge_txs_not_loaded", () => {
      // Arrange — mockQueryInstances[0] is bridgeTxQuery, data is null by default

      // Act
      const result = btcBridgeStore.isMempoolTxProcessed("abc123");

      // Assert
      expect(result).toBe(false);
    });

    it("it_should_return_true_when_txid_already_in_bridge_txs", () => {
      // Arrange — bridge_id "import_abc123" encodes txid "abc123"
      mockQueryInstances[0].data = [
        { ...fixture_of_import_bridge(), total_amount_usd: 0 },
      ];

      // Act
      const result = btcBridgeStore.isMempoolTxProcessed("abc123");

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("processImportBridgeTransaction", () => {
    it("it_should_fail_process_import_bridge_due_to_no_btc_txid", async () => {
      // Arrange
      const bridge = fixture_of_import_bridge({ btc_txid: null });
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));

      // Act
      await btcBridgeStore.processImportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        BridgeTransactionStatus.Failed,
        null,
        bridge.block_id ?? 0n,
        bridge.block_timestamp ?? 0n,
        bridge.confirmations,
      );
    });

    it("it_should_not_update_import_bridge_when_mempool_lookup_fails", async () => {
      // Arrange
      const bridge = fixture_of_import_bridge();
      mockGetTransactionById.mockResolvedValue(Err("Network error"));

      // Act
      await btcBridgeStore.processImportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).not.toHaveBeenCalled();
    });

    it("it_should_not_update_import_bridge_when_tx_is_unconfirmed", async () => {
      // Arrange
      const bridge = fixture_of_import_bridge();
      mockGetTransactionById.mockResolvedValue(
        Ok(
          fixture_of_bitcoin_transaction({
            is_confirmed: false,
            block_id: null,
            block_timestamp: null,
          }),
        ),
      );

      // Act
      await btcBridgeStore.processImportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).not.toHaveBeenCalled();
    });

    it("it_should_update_import_bridge_block_info_when_confirmed_but_not_enough_confirmations", async () => {
      // Arrange — tip is 3 blocks above confirmation block, min is 6
      const bridge = fixture_of_import_bridge();
      const btcTx = fixture_of_bitcoin_transaction({
        block_id: 840_000n,
        block_timestamp: 1_704_000_000n,
      });
      mockGetTransactionById.mockResolvedValue(Ok(btcTx));
      mockGetMinterInfo.mockResolvedValue(
        fixture_of_minter_info({ min_confirmations: 6 }),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_002n));
      const confirmingBlocks = fixture_of_confirming_blocks(840_000, 3);
      mockGetLatestBlocksFromHeight.mockResolvedValue(confirmingBlocks);
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));

      // Act
      await btcBridgeStore.processImportBridgeTransaction(bridge);

      // Assert
      expect(mockGetLatestBlocksFromHeight).toHaveBeenCalledWith(
        840_002,
        840_000,
      );
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        null, // status unchanged
        null,
        840_000n,
        1_704_000_000n,
        confirmingBlocks,
        null,
        null,
        null,
        null,
        null, // retry_times unchanged
      );
    });

    it("it_should_complete_import_bridge_when_enough_confirmations", async () => {
      // Arrange — tip is 5 blocks above confirmation block, 6 total >= min_confirmations 6
      const bridge = fixture_of_import_bridge();
      const btcTx = fixture_of_bitcoin_transaction({
        block_id: 840_000n,
        block_timestamp: 1_704_000_000n,
      });
      mockGetTransactionById.mockResolvedValue(Ok(btcTx));
      mockGetMinterInfo.mockResolvedValue(
        fixture_of_minter_info({ min_confirmations: 6 }),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      const confirmingBlocks = fixture_of_confirming_blocks(840_000, 6);
      mockGetLatestBlocksFromHeight.mockResolvedValue(confirmingBlocks);
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(
        Ok([fixture_of_minted_utxo_info()]),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(
        Ok({ ...bridge, status: BridgeTransactionStatus.Completed }),
      );

      // Act
      await btcBridgeStore.processImportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBalanceWithMintedInfo).toHaveBeenCalled();
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        BridgeTransactionStatus.Completed,
        null,
        840_000n,
        1_704_000_000n,
        confirmingBlocks,
        null,
        null,
        null,
        null,
        1, // retry_times incremented from 0
      );
    });
  });

  describe("processExportBridgeTransaction", () => {
    it("it_should_update_export_bridge_btc_txid_when_minter_status_is_submitted", async () => {
      // Arrange
      const bridge = fixture_of_export_bridge();
      mockRetrieveBtcStatusV2.mockResolvedValue(
        Ok({ kind: RetrieveBtcStatusKind.Submitted, txid: "btctxid123" }),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));

      // Act
      await btcBridgeStore.processExportBridgeTransaction(bridge);

      // Assert
      expect(mockRetrieveBtcStatusV2).toHaveBeenCalledWith(42n);
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        null,
        null,
        null,
        null,
        [],
        "btctxid123",
      );
    });

    it("it_should_fail_export_bridge_when_minter_status_is_amount_too_low", async () => {
      // Arrange
      const bridge = fixture_of_export_bridge();
      mockRetrieveBtcStatusV2.mockResolvedValue(
        Ok({ kind: RetrieveBtcStatusKind.AmountTooLow, txid: null }),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(
        Ok({ ...bridge, status: BridgeTransactionStatus.Failed }),
      );

      // Act
      await btcBridgeStore.processExportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        BridgeTransactionStatus.Failed,
      );
    });

    it("it_should_not_update_export_bridge_when_no_btc_txid_and_no_ckbtc_block_id", async () => {
      // Arrange
      const bridge = fixture_of_export_bridge({
        ckbtc_block_id: null,
        btc_txid: null,
      });

      // Act
      await btcBridgeStore.processExportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).not.toHaveBeenCalled();
    });

    it("it_should_complete_export_bridge_when_enough_confirmations", async () => {
      // Arrange — bridge has btc_txid set (no ckbtc_block_id path)
      const bridge = fixture_of_export_bridge({
        ckbtc_block_id: null,
        btc_txid: "exporttxid",
      });
      mockGetTransactionById.mockResolvedValue(
        Ok(
          fixture_of_bitcoin_transaction({
            txid: "exporttxid",
            block_id: 840_000n,
            block_timestamp: 1_704_000_000n,
          }),
        ),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      const confirmingBlocks = fixture_of_confirming_blocks(840_000, 6);
      mockGetLatestBlocksFromHeight.mockResolvedValue(confirmingBlocks);
      mockPersistedValues["ckbtcMinterMinConfirmations"] = 6;
      mockUpdateBridgeTransaction.mockResolvedValue(
        Ok({ ...bridge, status: BridgeTransactionStatus.Completed }),
      );

      // Act
      await btcBridgeStore.processExportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        BridgeTransactionStatus.Completed,
        null,
        840_000n,
        1_704_000_000n,
        confirmingBlocks,
      );
    });
  });

  describe("manualRefreshBalance", () => {
    it("it_should_fail_manual_refresh_due_to_minter_error", async () => {
      // Arrange
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(
        Err("Canister unavailable"),
      );

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Canister unavailable");
    });

    it("it_should_return_zero_when_no_minted_utxos", async () => {
      // Arrange
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(Ok([]));

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    it("it_should_fail_manual_refresh_due_to_missing_btc_address", async () => {
      // Arrange — btcAddress is null (default in mockPersistedValues)
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(
        Ok([fixture_of_minted_utxo_info()]),
      );

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("BTC address not available");
    });

    it("it_should_create_import_bridges_for_minted_utxos", async () => {
      // Arrange
      mockPersistedValues["btcAddress"] = "tb1qreceiver";
      const mintedInfo = fixture_of_minted_utxo_info();
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(Ok([mintedInfo]));
      mockGetDepositFee.mockResolvedValue(1_000n);
      mockGetMinterInfo.mockResolvedValue(fixture_of_minter_info());
      mockGetTipHeight.mockResolvedValue(Err("unavailable")); // skip confirmations path
      mockCreateManualImportBridgeTransaction.mockResolvedValue(
        Ok(fixture_of_import_bridge({ bridge_id: "import_ckbtc_123" })),
      );

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(1);
      expect(mockCreateManualImportBridgeTransaction).toHaveBeenCalledWith(
        "tb1qreceiver",
        mintedInfo.mintedAmount,
        mintedInfo.blockIndex,
        1_000n,
        mintedInfo.btcTxid,
      );
    });

    it("it_should_skip_when_existing_bridge_is_already_completed", async () => {
      // Arrange
      mockPersistedValues["btcAddress"] = "tb1qreceiver";
      const mintedInfo = fixture_of_minted_utxo_info({ btcTxid: "abc123" });
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(Ok([mintedInfo]));
      mockGetDepositFee.mockResolvedValue(1_000n);
      mockGetMinterInfo.mockResolvedValue(fixture_of_minter_info());
      mockGetTipHeight.mockResolvedValue(Err("unavailable"));
      // Existing bridge with same btcTxid, already Completed
      mockQueryInstances[0].data = [
        {
          ...fixture_of_import_bridge({
            btc_txid: "abc123",
            status: BridgeTransactionStatus.Completed,
          }),
          total_amount_usd: 0,
        },
      ];

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCreateManualImportBridgeTransaction).not.toHaveBeenCalled();
      expect(mockUpdateBridgeTransaction).not.toHaveBeenCalled();
    });

    it("it_should_update_existing_pending_bridge_to_completed_with_confirmations", async () => {
      // Arrange
      mockPersistedValues["btcAddress"] = "tb1qreceiver";
      const mintedInfo = fixture_of_minted_utxo_info({
        btcTxid: "abc123",
        btcHeight: 840_000,
      });
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(Ok([mintedInfo]));
      mockGetDepositFee.mockResolvedValue(1_000n);
      mockGetMinterInfo.mockResolvedValue(
        fixture_of_minter_info({ min_confirmations: 6 }),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      const confirmingBlocks = fixture_of_confirming_blocks(840_000, 6);
      mockGetLatestBlocksFromHeight.mockResolvedValue(confirmingBlocks);
      const existingBridge = fixture_of_import_bridge({
        bridge_id: "import_abc123",
        btc_txid: "abc123",
        status: BridgeTransactionStatus.Pending,
        block_timestamp: null,
      });
      mockQueryInstances[0].data = [{ ...existingBridge, total_amount_usd: 0 }];
      mockUpdateBridgeTransaction.mockResolvedValue(
        Ok({ ...existingBridge, status: BridgeTransactionStatus.Completed }),
      );

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCreateManualImportBridgeTransaction).not.toHaveBeenCalled();
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "import_abc123",
        BridgeTransactionStatus.Completed,
        null,
        840_000n,
        confirmingBlocks[0].block_timestamp,
        confirmingBlocks,
      );
    });

    it("it_should_update_existing_pending_bridge_to_completed_without_confirmations_when_mempool_unavailable", async () => {
      // Arrange
      mockPersistedValues["btcAddress"] = "tb1qreceiver";
      const mintedInfo = fixture_of_minted_utxo_info({
        btcTxid: "abc123",
        btcHeight: 840_000,
      });
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(Ok([mintedInfo]));
      mockGetDepositFee.mockResolvedValue(1_000n);
      mockGetMinterInfo.mockResolvedValue(fixture_of_minter_info());
      mockGetTipHeight.mockResolvedValue(Err("unavailable")); // no tip → skip confirmations
      const existingBridge = fixture_of_import_bridge({
        bridge_id: "import_abc123",
        btc_txid: "abc123",
        status: BridgeTransactionStatus.Pending,
        block_timestamp: 1_704_000_000n,
      });
      mockQueryInstances[0].data = [{ ...existingBridge, total_amount_usd: 0 }];
      mockUpdateBridgeTransaction.mockResolvedValue(
        Ok({ ...existingBridge, status: BridgeTransactionStatus.Completed }),
      );

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockCreateManualImportBridgeTransaction).not.toHaveBeenCalled();
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "import_abc123",
        BridgeTransactionStatus.Completed,
        null,
        840_000n,
        1_704_000_000n, // falls back to existingBridge.block_timestamp
        [],
      );
    });

    it("it_should_set_block_confirmations_on_created_bridges", async () => {
      // Arrange
      mockPersistedValues["btcAddress"] = "tb1qreceiver";
      const mintedInfo = fixture_of_minted_utxo_info({ btcHeight: 840_000 });
      mockUpdateBalanceWithMintedInfo.mockResolvedValue(Ok([mintedInfo]));
      mockGetDepositFee.mockResolvedValue(1_000n);
      mockGetMinterInfo.mockResolvedValue(
        fixture_of_minter_info({ min_confirmations: 6 }),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      const confirmingBlocks = fixture_of_confirming_blocks(840_000, 6);
      mockGetLatestBlocksFromHeight.mockResolvedValue(confirmingBlocks);
      const createdBridge = fixture_of_import_bridge({
        bridge_id: "import_ckbtc_123",
      });
      mockCreateManualImportBridgeTransaction.mockResolvedValue(
        Ok(createdBridge),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(createdBridge));

      // Act
      const result = await btcBridgeStore.manualRefreshBalance();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockGetLatestBlocksFromHeight).toHaveBeenCalledWith(
        840_005,
        840_000,
      );
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "import_ckbtc_123",
        null,
        null,
        840_000n,
        confirmingBlocks[0].block_timestamp,
        confirmingBlocks,
      );
    });
  });
});
