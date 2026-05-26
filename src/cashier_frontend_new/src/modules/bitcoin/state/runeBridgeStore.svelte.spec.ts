import { OMNITY_TARGET_CHAIN_ID } from "$modules/bitcoin/constants";
import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  BridgeType,
  type BridgeDetails,
  type BridgeTransaction,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { Err, Ok } from "ts-results-es";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function fixture_of_rune_token(
  overrides: Partial<TokenWithPriceAndBalance> = {},
): TokenWithPriceAndBalance {
  return {
    address: "rune-ledger-id",
    name: "Uncommon Goods",
    symbol: "UG",
    decimals: 8,
    balance: 0n,
    balanceUSD: 0,
    priceUSD: 0,
    enabled: true,
    fee: 10n,
    is_default: false,
    isRune: true,
    runeInfo: {
      runeId: "UNCOMMON•GOODS",
      tokenId: "omnity-rune-id",
    },
    indexId: undefined,
    ...overrides,
  } as TokenWithPriceAndBalance;
}

function fixture_of_rune_bridge(
  overrides: Partial<BridgeTransaction> = {},
): BridgeTransaction {
  return {
    bridge_id: "import_rune_abc123",
    icp_address: "aaaaa-aa",
    btc_address: "tb1qruneaddress",
    asset_infos: [
      {
        asset_type: "Runes",
        asset_id: "UNCOMMON•GOODS",
        amount: 1200n,
        decimals: 8,
      },
    ],
    bridge_type: BridgeType.Import,
    total_amount: 1200n,
    created_at_ts: 1_704_067_200n,
    deposit_fee: 0n,
    withdrawal_fee: 0n,
    btc_fee: 0n,
    btc_txid: "abc123",
    block_id: null,
    block_timestamp: null,
    confirmations: [],
    vin: [{ txid: "prevtxid", vout: 0 }],
    vout: [{ txid: "abc123", vout: 1 }],
    retry_times: 0,
    status: BridgeTransactionStatus.Pending,
    details: { kind: "runes", omnity_ticket_id: null } as BridgeDetails,
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
    vin: [{ txid: "prevtxid", vout: 0 }],
    vout: [
      { address: "tb1qruneaddress", value: 10_000n },
      { address: "tb1qother", value: 5_000n },
    ],
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

function fixture_of_rune_balance(overrides: Record<string, unknown> = {}) {
  return {
    amount: 1200n,
    script_pubkey: "0014abc",
    rune_id: "UNCOMMON•GOODS",
    ...overrides,
  };
}

const {
  mockGetRuneAddress,
  mockGetBridgeTransactions,
  mockUpdateBridgeTransaction,
  mockCreateRuneImportBridgeTransaction,
  mockGetAddressTransactions,
  mockGetTransactionById,
  mockGetAddressUtxos,
  mockGetTipHeight,
  mockGetLatestBlocksFromHeight,
  mockGenerateTicket,
  mockGenerateTicketStatus,
  mockQueryTxHash,
  mockGetRuneBalancesForOutputs,
  mockQueryInstances,
  mockPersistedValues,
  authAccountRef,
  walletTokensRef,
} = vi.hoisted(() => {
  type MockQuery = {
    data: unknown;
    queryFn: () => Promise<unknown>;
    isLoading: boolean;
    error: unknown;
    refresh: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    refreshAsync: ReturnType<typeof vi.fn>;
  };

  return {
    mockGetRuneAddress: vi.fn(),
    mockGetBridgeTransactions: vi.fn(),
    mockUpdateBridgeTransaction: vi.fn(),
    mockCreateRuneImportBridgeTransaction: vi.fn(),
    mockGetAddressTransactions: vi.fn(),
    mockGetTransactionById: vi.fn(),
    mockGetAddressUtxos: vi.fn(),
    mockGetTipHeight: vi.fn(),
    mockGetLatestBlocksFromHeight: vi.fn(),
    mockGenerateTicket: vi.fn(),
    mockGenerateTicketStatus: vi.fn(),
    mockQueryTxHash: vi.fn(),
    mockGetRuneBalancesForOutputs: vi.fn(),
    mockQueryInstances: [] as MockQuery[],
    mockPersistedValues: {} as Record<string, unknown>,
    authAccountRef: { value: null as { owner: string } | null },
    walletTokensRef: { value: [] as TokenWithPriceAndBalance[] },
  };
});

vi.mock("$modules/bitcoin/constants", () => ({
  BRIDGE_PAGE_SIZE: 10,
  CKBTC_MINTER_CANISTER_ID: "aaaaa-aa",
  MEMPOOL_API_POOLING_INTERVAL_SECONDS: 60,
  MEMPOOL_API_BASE_URLS: ["https://mempool.space/api"],
  OMNITY_TARGET_CHAIN_ID: "eICP",
}));

vi.mock("$modules/token/constants", () => ({
  CKBTC_CANISTER_ID: "mxzaz-hqaaa-aaaar-qaada-cai",
  KONGSWAP_INDEX_CANISTER_ID: "2ipq2-uqaaa-aaaar-qailq-cai",
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    get account() {
      return authAccountRef.value;
    },
    buildAnonymousAgent: vi.fn(() => ({})),
  },
}));

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    getRuneAddress: mockGetRuneAddress,
    getBridgeTransactions: mockGetBridgeTransactions,
    updateBridgeTransaction: mockUpdateBridgeTransaction,
    createRuneImportBridgeTransaction: mockCreateRuneImportBridgeTransaction,
  },
}));

vi.mock("$modules/bitcoin/services/mempoolService", () => ({
  mempoolService: {
    getAddressTransactions: mockGetAddressTransactions,
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

vi.mock("$modules/bitcoin/services/omnityHubService", () => ({
  omnityHubService: {
    queryTxHash: mockQueryTxHash,
  },
}));

vi.mock("$modules/bitcoin/services/omnityRunesIndexerService", () => ({
  omnityRunesIndexerService: {
    getRuneBalancesForOutputs: mockGetRuneBalancesForOutputs,
  },
}));

vi.mock("$modules/bitcoin/state/btcBridgeStore.svelte", () => ({
  btcBridgeStore: {
    minConfirmations: 6,
  },
}));

vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: {
    query: {
      get data() {
        return walletTokensRef.value;
      },
    },
  },
}));

vi.mock("$lib/managedState", () => ({
  managedState: vi
    .fn()
    .mockImplementation((config: { queryFn: () => Promise<unknown> }) => {
      const instance = {
        data: null as unknown,
        queryFn: config.queryFn,
        isLoading: false,
        error: undefined as unknown,
        refresh: vi.fn(),
        reset: vi.fn(),
        refreshAsync: vi.fn(),
      };
      mockQueryInstances.push(instance);
      return instance;
    }),
}));

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

import { runeBridgeStore } from "./runeBridgeStore.svelte";

describe("RuneBridgeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authAccountRef.value = null;
    walletTokensRef.value = [];
    mockPersistedValues["runeAddress"] = null;
    for (const q of mockQueryInstances) {
      q.data = null;
      q.isLoading = false;
      q.error = undefined;
    }
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchRuneAddress", () => {
    it("it_should_fail_fetch_rune_address_due_to_service_error", async () => {
      // Arrange
      mockGetRuneAddress.mockResolvedValue(Err("Omnity error"));

      // Act
      const result = await runeBridgeStore.fetchRuneAddress();

      // Assert
      expect(result).toBeNull();
    });

    it("it_should_fetch_rune_address", async () => {
      // Arrange
      mockGetRuneAddress.mockResolvedValue(Ok("tb1qruneaddress"));

      // Act
      const result = await runeBridgeStore.fetchRuneAddress();

      // Assert
      expect(result).toBe("tb1qruneaddress");
    });
  });

  describe("getImportBridgeTransactionsForToken", () => {
    it("it_should_query_import_bridge_transactions_for_selected_rune", async () => {
      authAccountRef.value = { owner: "aaaaa-aa" };
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");
      mockGetBridgeTransactions.mockResolvedValue([fixture_of_rune_bridge()]);

      const result =
        (await mockQueryInstances[1].queryFn()) as BridgeTransactionWithUsdValue[];

      expect(mockGetBridgeTransactions).toHaveBeenCalledWith(
        0,
        10,
        null,
        BridgeType.Import,
        "Runes",
        "UNCOMMON•GOODS",
      );
      expect(result).toHaveLength(1);
      expect(result[0].total_amount_usd).toBe(0);
    });

    it("it_should_return_empty_import_bridge_transactions_when_rune_id_is_null", async () => {
      authAccountRef.value = { owner: "aaaaa-aa" };
      runeBridgeStore.setRuneId(null);

      const result = await mockQueryInstances[1].queryFn();

      expect(result).toEqual([]);
      expect(mockGetBridgeTransactions).not.toHaveBeenCalled();
      expect(runeBridgeStore.hasMoreImports).toBe(false);
    });
  });

  describe("exportBridgeTxQuery", () => {
    it("it_should_query_export_bridge_transactions_for_selected_rune", async () => {
      authAccountRef.value = { owner: "aaaaa-aa" };
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");
      mockGetBridgeTransactions.mockResolvedValue([
        fixture_of_rune_bridge({
          bridge_type: BridgeType.Export,
          status: BridgeTransactionStatus.Created,
        }),
      ]);

      const result =
        (await mockQueryInstances[2].queryFn()) as BridgeTransactionWithUsdValue[];

      expect(mockGetBridgeTransactions).toHaveBeenCalledWith(
        0,
        10,
        null,
        BridgeType.Export,
        "Runes",
        "UNCOMMON•GOODS",
      );
      expect(result).toHaveLength(1);
      expect(result[0].total_amount_usd).toBe(0);
    });

    it("it_should_return_empty_export_bridge_transactions_when_rune_id_is_null", async () => {
      authAccountRef.value = { owner: "aaaaa-aa" };
      runeBridgeStore.setRuneId(null);

      const result = await mockQueryInstances[2].queryFn();

      expect(result).toEqual([]);
      expect(mockGetBridgeTransactions).not.toHaveBeenCalled();
      expect(runeBridgeStore.hasMoreExports).toBe(false);
    });
  });

  describe("bridgeTxQuery", () => {
    it("it_should_query_only_rune_bridge_transactions", async () => {
      authAccountRef.value = { owner: "aaaaa-aa" };
      mockGetBridgeTransactions.mockResolvedValue([fixture_of_rune_bridge()]);

      const result =
        (await mockQueryInstances[0].queryFn()) as BridgeTransactionWithUsdValue[];

      expect(mockGetBridgeTransactions).toHaveBeenCalledWith(
        0,
        10,
        null,
        null,
        "Runes",
      );
      expect(result).toHaveLength(1);
      expect(result[0].total_amount_usd).toBe(0);
    });
  });

  describe("setRuneId", () => {
    it("it_should_update_rune_id_and_refresh_import_export_queries", () => {
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");

      expect(runeBridgeStore.rune_id).toBe("UNCOMMON•GOODS");
      expect(mockQueryInstances[1].refresh).toHaveBeenCalledTimes(1);
      expect(mockQueryInstances[2].refresh).toHaveBeenCalledTimes(1);
      expect(runeBridgeStore.hasMoreImports).toBe(true);
      expect(runeBridgeStore.hasMoreExports).toBe(true);
    });

    it("it_should_not_refresh_queries_when_rune_id_does_not_change", () => {
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");
      vi.clearAllMocks();

      runeBridgeStore.setRuneId("UNCOMMON•GOODS");

      expect(mockQueryInstances[1].refresh).not.toHaveBeenCalled();
      expect(mockQueryInstances[2].refresh).not.toHaveBeenCalled();
    });

    it("it_should_clear_rune_id_on_reset", () => {
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");

      runeBridgeStore.reset();

      expect(runeBridgeStore.rune_id).toBeNull();
      expect(mockQueryInstances[0].reset).toHaveBeenCalled();
      expect(mockQueryInstances[1].reset).toHaveBeenCalled();
      expect(mockQueryInstances[2].reset).toHaveBeenCalled();
    });
  });

  describe("bridgesHistory", () => {
    it("it_should_merge_import_and_export_bridges_for_selected_rune", () => {
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");
      mockQueryInstances[1].data = [
        {
          ...fixture_of_rune_bridge({
            bridge_id: "import_rune_old",
            created_at_ts: 1_704_067_200n,
          }),
          total_amount_usd: 0,
        },
      ];
      mockQueryInstances[2].data = [
        {
          ...fixture_of_rune_bridge({
            bridge_id: "export_rune_new",
            bridge_type: BridgeType.Export,
            created_at_ts: 1_704_067_300n,
          }),
          total_amount_usd: 0,
        },
      ];

      expect(
        runeBridgeStore.bridgesHistory.map((bridge) => bridge.bridge_id),
      ).toEqual(["export_rune_new", "import_rune_old"]);
    });

    it("it_should_return_empty_bridges_history_when_rune_id_is_null", () => {
      runeBridgeStore.setRuneId(null);
      mockQueryInstances[1].data = null;
      mockQueryInstances[2].data = null;

      expect(runeBridgeStore.bridgesHistory).toEqual([]);
    });

    it("it_should_return_combined_rune_bridge_history_helpers", () => {
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");
      mockQueryInstances[1].isLoading = true;
      mockQueryInstances[2].error = new Error("rune bridge error");
      runeBridgeStore.hasMoreImports = true;
      runeBridgeStore.hasMoreExports = false;

      expect(runeBridgeStore.isLoadingBridgesHistory).toBe(true);
      expect(runeBridgeStore.bridgesHistoryError).toEqual(
        mockQueryInstances[2].error,
      );
      expect(runeBridgeStore.hasMoreBridgesHistory).toBe(true);
    });

    it("it_should_load_more_combined_rune_bridge_history", () => {
      runeBridgeStore.setRuneId("UNCOMMON•GOODS");
      const importSpy = vi.spyOn(runeBridgeStore, "loadMoreImports");
      const exportSpy = vi.spyOn(runeBridgeStore, "loadMoreExports");
      runeBridgeStore.hasMoreImports = true;
      runeBridgeStore.hasMoreExports = true;

      runeBridgeStore.loadMoreBridgesHistory();

      expect(importSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("lookupMempoolTransactionByAddress", () => {
    it("it_should_fail_lookup_mempool_transaction_due_to_mempool_error", async () => {
      // Arrange
      mockGetAddressTransactions.mockResolvedValue(Err("Network error"));

      // Act
      const result =
        await runeBridgeStore.lookupMempoolTransactionByAddress(
          "tb1qruneaddress",
        );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Get address transactions failed");
    });

    it("it_should_do_lookup_mempool_transactions_by_address", async () => {
      // Arrange
      mockGetAddressTransactions.mockResolvedValue(
        Ok([fixture_of_bitcoin_transaction({ is_confirmed: false })]),
      );

      // Act
      const result =
        await runeBridgeStore.lookupMempoolTransactionByAddress(
          "tb1qruneaddress",
        );

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(1);
      expect(result.unwrap()[0].txid).toBe("abc123");
    });

    it("it_should_filter_out_confirmed_transactions", async () => {
      mockGetAddressTransactions.mockResolvedValue(
        Ok([fixture_of_bitcoin_transaction({ is_confirmed: true })]),
      );

      const result =
        await runeBridgeStore.lookupMempoolTransactionByAddress(
          "tb1qruneaddress",
        );

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });
  });

  describe("processRuneMempoolTransactions", () => {
    it("it_should_fail_do_process_rune_mempool_transactions_due_to_missing_rune_address", async () => {
      // Arrange
      walletTokensRef.value = [fixture_of_rune_token()];

      // Act
      await runeBridgeStore.processRuneMempoolTransactions();

      // Assert
      expect(mockCreateRuneImportBridgeTransaction).not.toHaveBeenCalled();
    });

    it("it_should_do_process_rune_mempool_transactions", async () => {
      // Arrange
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";
      walletTokensRef.value = [fixture_of_rune_token()];
      mockGetAddressTransactions.mockResolvedValue(
        Ok([fixture_of_bitcoin_transaction({ is_confirmed: false })]),
      );
      mockGetRuneBalancesForOutputs.mockResolvedValue(
        Ok([[[fixture_of_rune_balance()]]]),
      );
      mockCreateRuneImportBridgeTransaction.mockResolvedValue(
        Ok(fixture_of_rune_bridge()),
      );

      // Act
      await runeBridgeStore.processRuneMempoolTransactions();

      // Assert
      expect(mockCreateRuneImportBridgeTransaction).toHaveBeenCalledWith({
        btcAddress: "tb1qsender",
        runeId: "UNCOMMON•GOODS",
        amount: 0n,
        decimals: 8,
        btcTxid: "abc123",
        vin: [{ txid: "prevtxid", vout: 0 }],
        vout: [{ txid: "abc123", vout: 0 }],
      });
      expect(mockQueryInstances[0].refresh).toHaveBeenCalled();
      expect(mockQueryInstances[1].refresh).toHaveBeenCalled();
      expect(mockQueryInstances[2].refresh).toHaveBeenCalled();
    });

    it("it_should_fail_do_process_rune_mempool_transactions_due_to_existing_bridge", async () => {
      // Arrange
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";
      walletTokensRef.value = [fixture_of_rune_token()];
      mockQueryInstances[0].data = [
        { ...fixture_of_rune_bridge(), total_amount_usd: 0 },
      ];
      mockGetAddressTransactions.mockResolvedValue(
        Ok([fixture_of_bitcoin_transaction({ is_confirmed: false })]),
      );
      mockGetRuneBalancesForOutputs.mockResolvedValue(
        Ok([[[fixture_of_rune_balance()]]]),
      );

      // Act
      await runeBridgeStore.processRuneMempoolTransactions();

      // Assert
      expect(mockCreateRuneImportBridgeTransaction).not.toHaveBeenCalled();
    });
  });

  describe("createMempoolTransactionTask", () => {
    it("it_should_not_process_when_rune_address_is_null", async () => {
      // Arrange — runeAddress is null by default
      const handle = runeBridgeStore.createMempoolTransactionTask();

      // Act
      await vi.advanceTimersByTimeAsync(60 * 1000);

      // Assert
      expect(mockGetAddressTransactions).not.toHaveBeenCalled();

      clearInterval(handle);
    });

    it("it_should_not_create_bridge_when_mempool_lookup_fails", async () => {
      // Arrange
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";
      walletTokensRef.value = [fixture_of_rune_token()];
      mockGetAddressTransactions.mockResolvedValue(Err("Network error"));
      const handle = runeBridgeStore.createMempoolTransactionTask();

      // Act
      await vi.advanceTimersByTimeAsync(60 * 1000);

      // Assert
      expect(mockGetAddressTransactions).toHaveBeenCalled();
      expect(mockCreateRuneImportBridgeTransaction).not.toHaveBeenCalled();

      clearInterval(handle);
    });

    it("it_should_fetch_and_process_rune_mempool_txs_on_interval", async () => {
      // Arrange
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";
      walletTokensRef.value = [fixture_of_rune_token()];
      mockGetAddressTransactions.mockResolvedValue(
        Ok([fixture_of_bitcoin_transaction({ is_confirmed: false })]),
      );
      mockGetRuneBalancesForOutputs.mockResolvedValue(
        Ok([[[fixture_of_rune_balance()]]]),
      );
      mockCreateRuneImportBridgeTransaction.mockResolvedValue(
        Ok(fixture_of_rune_bridge()),
      );
      const handle = runeBridgeStore.createMempoolTransactionTask();

      // Act
      await vi.advanceTimersByTimeAsync(60 * 1000);

      // Assert
      expect(mockGetAddressTransactions).toHaveBeenCalledWith(
        "tb1qruneaddress",
      );
      expect(mockCreateRuneImportBridgeTransaction).toHaveBeenCalled();

      clearInterval(handle);
    });
  });

  describe("processRuneImportBridgeTransaction", () => {
    it("it_should_keep_pending_rune_import_bridge_when_rune_balance_is_not_indexed_yet", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge();
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      mockGetLatestBlocksFromHeight.mockResolvedValue(
        fixture_of_confirming_blocks(840_000, 6),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));
      mockGetRuneBalancesForOutputs.mockResolvedValue(Ok([[]]));

      // Act
      await runeBridgeStore.processRuneImportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).toHaveBeenNthCalledWith(
        1,
        bridge.bridge_id,
        null,
        null,
        840_000n,
        1_704_000_000n,
        fixture_of_confirming_blocks(840_000, 6),
        null,
        null,
        null,
        null,
        null,
        null,
        bridge.vin,
        bridge.vout,
      );
      expect(mockUpdateBridgeTransaction).not.toHaveBeenNthCalledWith(
        2,
        bridge.bridge_id,
        BridgeTransactionStatus.Failed,
      );
    });

    it("it_should_do_process_rune_import_bridge_transaction_and_generate_ticket", async () => {
      // Arrange
      authAccountRef.value = { owner: "aaaaa-aa" };
      const bridge = fixture_of_rune_bridge();
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      const confirmingBlocks = fixture_of_confirming_blocks(840_000, 6);
      mockGetLatestBlocksFromHeight.mockResolvedValue(confirmingBlocks);
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));
      mockGetRuneBalancesForOutputs.mockResolvedValue(
        Ok([[[fixture_of_rune_balance()]]]),
      );
      mockGenerateTicket.mockResolvedValue(Ok(undefined));

      // Act
      await runeBridgeStore.processRuneImportBridgeTransaction(bridge);

      // Assert
      expect(mockGenerateTicket).toHaveBeenCalledWith({
        txid: "abc123",
        target_chain_id: OMNITY_TARGET_CHAIN_ID,
        amount: 1200n,
        receiver: "aaaaa-aa",
        rune_id: "UNCOMMON•GOODS",
      });
      expect(mockUpdateBridgeTransaction).toHaveBeenNthCalledWith(
        2,
        bridge.bridge_id,
        BridgeTransactionStatus.Confirmed,
        null,
        null,
        null,
        [],
        null,
        null,
        null,
        null,
        null,
        "abc123",
        [],
        [],
        [
          {
            asset_type: "Runes",
            asset_id: "UNCOMMON•GOODS",
            amount: 1200n,
            decimals: 8,
          },
        ],
      );
    });

    it("it_should_do_complete_rune_import_bridge_transaction_when_ticket_is_finalized", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        status: BridgeTransactionStatus.Confirmed,
        details: { kind: "runes", omnity_ticket_id: "abc123" },
      });
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_005n));
      mockGetLatestBlocksFromHeight.mockResolvedValue(
        fixture_of_confirming_blocks(840_000, 6),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));
      mockGenerateTicketStatus.mockResolvedValue(
        Ok({ Finalized: { txid: "abc123" } }),
      );

      // Act
      await runeBridgeStore.processRuneImportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).toHaveBeenNthCalledWith(
        2,
        bridge.bridge_id,
        BridgeTransactionStatus.Completed,
      );
    });
  });

  describe("manualRefreshBalance", () => {
    it("it_should_fail_manual_refresh_balance_due_to_missing_rune_address", async () => {
      // Arrange

      // Act
      const result = await runeBridgeStore.manualRefreshBalance(
        fixture_of_rune_token(),
      );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Rune address not available");
    });

    it("it_should_fail_manual_refresh_balance_due_to_missing_rune_metadata", async () => {
      // Arrange
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";

      // Act
      const result = await runeBridgeStore.manualRefreshBalance({
        decimals: 8,
        runeInfo: undefined,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Rune metadata not available");
    });

    it("it_should_do_manual_refresh_balance", async () => {
      // Arrange
      authAccountRef.value = { owner: "aaaaa-aa" };
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";
      mockGetAddressUtxos.mockResolvedValue(Ok(["abc123:1"]));
      mockGetRuneBalancesForOutputs.mockResolvedValue(
        Ok([[[fixture_of_rune_balance()]]]),
      );
      mockGenerateTicket.mockResolvedValue(Ok(undefined));
      mockCreateRuneImportBridgeTransaction.mockResolvedValue(
        Ok(fixture_of_rune_bridge({ bridge_id: "import_rune_manual" })),
      );

      // Act
      const result = await runeBridgeStore.manualRefreshBalance(
        fixture_of_rune_token(),
      );

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(1);
      expect(mockGenerateTicket).toHaveBeenCalledWith({
        txid: "abc123",
        target_chain_id: OMNITY_TARGET_CHAIN_ID,
        amount: 1200n,
        receiver: "aaaaa-aa",
        rune_id: "UNCOMMON•GOODS",
      });
      expect(mockCreateRuneImportBridgeTransaction).toHaveBeenCalledWith({
        btcAddress: "tb1qruneaddress",
        runeId: "UNCOMMON•GOODS",
        amount: 1200n,
        decimals: 8,
        btcTxid: "abc123",
        status: BridgeTransactionStatus.Confirmed,
        omnity_ticket_id: "abc123",
        vout: [{ txid: "abc123", vout: 1 }],
      });
      expect(mockUpdateBridgeTransaction).not.toHaveBeenCalled();
    });
  });

  describe("processRuneExportBridgeTransaction", () => {
    it("it_should_update_rune_export_bridge_with_btc_txid_from_omnity_hub", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        bridge_type: BridgeType.Export,
        status: BridgeTransactionStatus.Pending,
        btc_txid: null,
        details: { kind: "runes", omnity_ticket_id: "ticket-123" },
      });
      mockQueryTxHash.mockResolvedValue(Ok("btc-txid-123"));
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));

      // Act
      await runeBridgeStore.processRuneExportBridgeTransaction(bridge);

      // Assert
      expect(mockQueryTxHash).toHaveBeenCalledWith("ticket-123");
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        null,
        null,
        null,
        null,
        [],
        "btc-txid-123",
      );
    });

    it("it_should_sync_confirmations_for_rune_export_bridge_with_btc_txid", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        bridge_type: BridgeType.Export,
        status: BridgeTransactionStatus.Pending,
        btc_txid: "btc-txid-123",
        details: { kind: "runes", omnity_ticket_id: "ticket-123" },
      });
      mockGetTransactionById.mockResolvedValue(
        Ok(
          fixture_of_bitcoin_transaction({
            txid: "btc-txid-123",
            block_id: 840_100n,
            block_timestamp: 1_704_000_100n,
          }),
        ),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_110n));
      mockGetLatestBlocksFromHeight.mockResolvedValue(
        fixture_of_confirming_blocks(840_100, 3),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));

      // Act
      await runeBridgeStore.processRuneExportBridgeTransaction(bridge);

      // Assert
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        bridge.bridge_id,
        null,
        null,
        840_100n,
        1_704_000_100n,
        fixture_of_confirming_blocks(840_100, 3),
        "btc-txid-123",
      );
    });

    it("it_should_continue_syncing_rune_export_bridge_when_initial_btc_txid_persist_fails", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        bridge_type: BridgeType.Export,
        status: BridgeTransactionStatus.Pending,
        btc_txid: null,
        details: { kind: "runes", omnity_ticket_id: "ticket-123" },
      });
      mockQueryTxHash.mockResolvedValue(Ok("btc-txid-123"));
      mockGetTransactionById.mockResolvedValue(
        Ok(
          fixture_of_bitcoin_transaction({
            txid: "btc-txid-123",
            block_id: 840_100n,
            block_timestamp: 1_704_000_100n,
          }),
        ),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_110n));
      mockGetLatestBlocksFromHeight.mockResolvedValue(
        fixture_of_confirming_blocks(840_100, 3),
      );
      mockUpdateBridgeTransaction
        .mockResolvedValueOnce(Err("persist failed"))
        .mockResolvedValueOnce(Ok(bridge));

      await runeBridgeStore.processRuneExportBridgeTransaction(bridge);

      expect(mockQueryTxHash).toHaveBeenCalledWith("ticket-123");
      expect(mockGetTransactionById).toHaveBeenCalledWith("btc-txid-123");
      expect(mockUpdateBridgeTransaction).toHaveBeenNthCalledWith(
        1,
        bridge.bridge_id,
        null,
        null,
        null,
        null,
        [],
        "btc-txid-123",
      );
      expect(mockUpdateBridgeTransaction).toHaveBeenNthCalledWith(
        2,
        bridge.bridge_id,
        null,
        null,
        840_100n,
        1_704_000_100n,
        fixture_of_confirming_blocks(840_100, 3),
        "btc-txid-123",
      );
    });
  });

  describe("createPendingBridgeTransactionsTask", () => {
    it("it_should_not_process_when_no_rune_bridges_found", async () => {
      // Arrange
      mockGetBridgeTransactions.mockResolvedValue([]);
      const handle = runeBridgeStore.createPendingBridgeTransactionsTask();

      // Act
      await vi.advanceTimersByTimeAsync(60 * 1000);

      // Assert
      expect(mockGetBridgeTransactions).toHaveBeenCalled();
      expect(mockGetBridgeTransactions).toHaveBeenNthCalledWith(
        1,
        0,
        1,
        BridgeTransactionStatus.Pending,
        null,
        "Runes",
      );
      expect(mockGetBridgeTransactions).toHaveBeenNthCalledWith(
        2,
        0,
        1,
        BridgeTransactionStatus.Confirmed,
        null,
        "Runes",
      );
      expect(mockGetTransactionById).not.toHaveBeenCalled();

      clearInterval(handle);
    });

    it("it_should_process_import_bridge_when_pending_rune_import_bridge_found", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        bridge_type: BridgeType.Import,
        status: BridgeTransactionStatus.Pending,
        btc_txid: "abc123",
      });
      mockGetBridgeTransactions
        .mockResolvedValueOnce([bridge])
        .mockResolvedValue([]);
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_006n));
      mockGetLatestBlocksFromHeight.mockResolvedValue(
        fixture_of_confirming_blocks(840_000, 6),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));
      mockGetRuneBalancesForOutputs.mockResolvedValue(Ok([[]]));
      const handle = runeBridgeStore.createPendingBridgeTransactionsTask();

      // Act
      await vi.advanceTimersByTimeAsync(60 * 1000);

      // Assert
      expect(mockGetTransactionById).toHaveBeenCalledWith("abc123");

      clearInterval(handle);
    });

    it("it_should_process_export_bridge_when_pending_rune_export_bridge_found", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        bridge_type: BridgeType.Export,
        status: BridgeTransactionStatus.Pending,
        btc_txid: "export-txid",
        details: { kind: "runes", omnity_ticket_id: "ticket-export-123" },
      });
      mockGetBridgeTransactions
        .mockResolvedValueOnce([bridge])
        .mockResolvedValue([]);
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction({ txid: "export-txid" })),
      );
      mockGetTipHeight.mockResolvedValue(Ok(840_006n));
      mockGetLatestBlocksFromHeight.mockResolvedValue(
        fixture_of_confirming_blocks(840_000, 6),
      );
      mockUpdateBridgeTransaction.mockResolvedValue(Ok(bridge));
      const handle = runeBridgeStore.createPendingBridgeTransactionsTask();

      // Act
      await vi.advanceTimersByTimeAsync(60 * 1000);

      // Assert
      expect(mockGetTransactionById).toHaveBeenCalledWith("export-txid");

      clearInterval(handle);
    });
  });
});
