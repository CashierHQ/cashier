import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";
import {
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransaction,
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
    ckbtc_block_id: null,
    block_id: null,
    block_timestamp: null,
    confirmations: [],
    omnity_ticket_id: null,
    vin: [{ txid: "prevtxid", vout: 0 }],
    vout: [{ txid: "abc123", vout: 1 }],
    retry_times: 0,
    status: BridgeTransactionStatus.Pending,
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
  walletTokensRef,
} = vi.hoisted(() => {
  type MockQuery = {
    data: unknown;
    refresh: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    refreshAsync: ReturnType<typeof vi.fn>;
  };

  return {
    mockGetRuneAddress: vi.fn(),
    mockGetBridgeTransactions: vi.fn(),
    mockUpdateBridgeTransaction: vi.fn(),
    mockCreateRuneImportBridgeTransaction: vi.fn(),
    mockGetMempoolTxs: vi.fn(),
    mockGetTransactionById: vi.fn(),
    mockGetAddressUtxos: vi.fn(),
    mockGetTipHeight: vi.fn(),
    mockGetLatestBlocksFromHeight: vi.fn(),
    mockGenerateTicket: vi.fn(),
    mockGenerateTicketStatus: vi.fn(),
    mockGetRuneBalancesForOutputs: vi.fn(),
    mockQueryInstances: [] as MockQuery[],
    mockPersistedValues: {} as Record<string, unknown>,
    authAccountRef: { value: null as { owner: string } | null },
    walletTokensRef: { value: [] as TokenWithPriceAndBalance[] },
  };
});

vi.mock("$modules/bitcoin/constants", () => ({
  BRIDGE_PAGE_SIZE: 10,
  MEMPOOL_API_POOLING_INTERVAL_SECONDS: 60,
  MEMPOOL_API_BASE_URLS: ["https://mempool.space/api"],
}));

vi.mock("$modules/token/constants", () => ({
  CKBTC_CANISTER_ID: "mxzaz-hqaaa-aaaar-qaada-cai",
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
    getRuneAddress: mockGetRuneAddress,
    getBridgeTransactions: mockGetBridgeTransactions,
    updateBridgeTransaction: mockUpdateBridgeTransaction,
    createRuneImportBridgeTransaction: mockCreateRuneImportBridgeTransaction,
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
    query: {
      get data() {
        return walletTokensRef.value;
      },
    },
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
}));

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
    it("it_should_fail_get_import_bridge_transactions_for_token_due_to_missing_rune_metadata", () => {
      // Arrange
      mockQueryInstances[1].data = [
        { ...fixture_of_rune_bridge(), total_amount_usd: 0 },
      ];

      // Act
      const result = runeBridgeStore.getImportBridgeTransactionsForToken({
        address: "rune-ledger-id",
        isRune: false,
        runeInfo: undefined,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it("it_should_do_get_import_bridge_transactions_for_matching_rune", () => {
      // Arrange
      mockQueryInstances[1].data = [
        { ...fixture_of_rune_bridge(), total_amount_usd: 0 },
        {
          ...fixture_of_rune_bridge({
            bridge_id: "import_other",
            asset_infos: [
              {
                asset_type: "Runes",
                asset_id: "DOG•GO•TO•THE•MOON",
                amount: 500n,
                decimals: 8,
              },
            ],
          }),
          total_amount_usd: 0,
        },
      ];

      // Act
      const result = runeBridgeStore.getImportBridgeTransactionsForToken(
        fixture_of_rune_token(),
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].bridge_id).toBe("import_rune_abc123");
    });
  });

  describe("lookupMempoolTransactionByAddress", () => {
    it("it_should_fail_lookup_mempool_transaction_due_to_mempool_error", async () => {
      // Arrange
      mockGetMempoolTxs.mockResolvedValue(Err("Network error"));

      // Act
      const result =
        await runeBridgeStore.lookupMempoolTransactionByAddress(
          "tb1qruneaddress",
        );

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Get mempool tx IDs failed");
    });

    it("it_should_do_lookup_mempool_transactions_by_address", async () => {
      // Arrange
      mockGetMempoolTxs.mockResolvedValue(Ok(["abc123"]));
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
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
      mockGetMempoolTxs.mockResolvedValue(Ok(["abc123"]));
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
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
        btcAddress: "tb1qruneaddress",
        runeId: "UNCOMMON•GOODS",
        amount: 1200n,
        decimals: 8,
        btcTxid: "abc123",
        vin: [{ txid: "prevtxid", vout: 0 }],
        vout: [{ txid: "abc123", vout: 0 }],
      });
      expect(mockQueryInstances[0].refresh).toHaveBeenCalled();
      expect(mockQueryInstances[1].refresh).toHaveBeenCalled();
    });

    it("it_should_fail_do_process_rune_mempool_transactions_due_to_existing_bridge", async () => {
      // Arrange
      mockPersistedValues["runeAddress"] = "tb1qruneaddress";
      walletTokensRef.value = [fixture_of_rune_token()];
      mockQueryInstances[0].data = [
        { ...fixture_of_rune_bridge(), total_amount_usd: 0 },
      ];
      mockGetMempoolTxs.mockResolvedValue(Ok(["abc123"]));
      mockGetTransactionById.mockResolvedValue(
        Ok(fixture_of_bitcoin_transaction()),
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

  describe("processRuneImportBridgeTransaction", () => {
    it("it_should_fail_process_rune_import_bridge_transaction_due_to_missing_rune_balance", async () => {
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
        target_chain_id: "eICP",
        amount: 1200n,
        receiver: "aaaaa-aa",
        rune_id: "UNCOMMON•GOODS",
      });
      expect(mockUpdateBridgeTransaction).toHaveBeenNthCalledWith(
        2,
        bridge.bridge_id,
        null,
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
      );
    });

    it("it_should_do_complete_rune_import_bridge_transaction_when_ticket_is_finalized", async () => {
      // Arrange
      const bridge = fixture_of_rune_bridge({
        omnity_ticket_id: "abc123",
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
      mockUpdateBridgeTransaction.mockResolvedValue(
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
        target_chain_id: "eICP",
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
        vout: [{ txid: "abc123", vout: 1 }],
      });
      expect(mockUpdateBridgeTransaction).toHaveBeenCalledWith(
        "import_rune_manual",
        null,
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
      );
    });
  });
});
