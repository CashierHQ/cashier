// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TransactionKind,
  type TokenTransaction,
  type TokenWithPriceAndBalance,
} from "$modules/token/types";
import {
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";

type MockHistoryStore = {
  transactions: TokenTransaction[];
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: unknown;
  loadMore: ReturnType<typeof vi.fn>;
};

type MockBridgeHistoryStore = {
  bridgesHistory: BridgeTransactionWithUsdValue[];
  hasMoreBridgesHistory: boolean;
  isLoadingBridgesHistory: boolean;
  bridgesHistoryError: unknown;
};

const {
  authAccountRef,
  historyStoreRef,
  btcStoreRef,
  runeStoreRef,
  mockWalletHistoryLoadMore,
  mockBtcLoadMoreBridgesHistory,
  mockRuneLoadMoreBridgesHistory,
  mockRuneSetRuneId,
  mockGetBridgeTransactions,
} = vi.hoisted(() => ({
  authAccountRef: { value: { owner: "aaaaa-aa" } as { owner: string } | null },
  historyStoreRef: {
    value: {
      transactions: [],
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      error: undefined as unknown,
      loadMore: vi.fn(),
    } as MockHistoryStore,
  },
  btcStoreRef: {
    value: {
      bridgesHistory: [],
      hasMoreBridgesHistory: false,
      isLoadingBridgesHistory: false,
      bridgesHistoryError: undefined as unknown,
      minConfirmations: 6,
    } as MockBridgeHistoryStore & { minConfirmations: number },
  },
  runeStoreRef: {
    value: {
      bridgesHistory: [],
      hasMoreBridgesHistory: false,
      isLoadingBridgesHistory: false,
      bridgesHistoryError: undefined as unknown,
    } as MockBridgeHistoryStore,
  },
  mockWalletHistoryLoadMore: vi.fn(),
  mockBtcLoadMoreBridgesHistory: vi.fn(),
  mockRuneLoadMoreBridgesHistory: vi.fn(),
  mockRuneSetRuneId: vi.fn(),
  mockGetBridgeTransactions: vi.fn(),
}));

vi.mock("$modules/token/state/walletHistoryStore.svelte", () => ({
  getWalletHistoryStore: vi.fn(() => ({
    get transactions() {
      return historyStoreRef.value.transactions;
    },
    get hasMore() {
      return historyStoreRef.value.hasMore;
    },
    get isLoading() {
      return historyStoreRef.value.isLoading;
    },
    get isLoadingMore() {
      return historyStoreRef.value.isLoadingMore;
    },
    get error() {
      return historyStoreRef.value.error;
    },
    loadMore: mockWalletHistoryLoadMore,
  })),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    get account() {
      return authAccountRef.value;
    },
  },
}));

vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => key,
  },
}));

vi.mock("$modules/token/constants", () => ({
  CKBTC_CANISTER_ID: "mxzaz-hqaaa-aaaar-qaada-cai",
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ICP_INDEX_CANISTER_ID: "qhbym-qaaaa-aaaaa-aaafq-cai",
}));

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    getBridgeTransactions: mockGetBridgeTransactions,
  },
}));

vi.mock("$modules/token/state/tokenPriceStore.svelte", () => ({
  tokenPriceStore: {
    getTokenPriceByCanisterId: vi.fn(() => null),
  },
}));

vi.mock("$modules/token/state/walletStore.svelte", () => ({
  walletStore: {
    query: {
      data: [],
    },
  },
}));

vi.mock("$modules/bitcoin/state/btcBridgeStore.svelte", () => ({
  btcBridgeStore: {
    get bridgesHistory() {
      return btcStoreRef.value.bridgesHistory;
    },
    get hasMoreBridgesHistory() {
      return btcStoreRef.value.hasMoreBridgesHistory;
    },
    get isLoadingBridgesHistory() {
      return btcStoreRef.value.isLoadingBridgesHistory;
    },
    get bridgesHistoryError() {
      return btcStoreRef.value.bridgesHistoryError;
    },
    get minConfirmations() {
      return btcStoreRef.value.minConfirmations;
    },
    loadMoreBridgesHistory: mockBtcLoadMoreBridgesHistory,
  },
}));

vi.mock("$modules/bitcoin/state/runeBridgeStore.svelte", () => ({
  runeBridgeStore: {
    get bridgesHistory() {
      return runeStoreRef.value.bridgesHistory;
    },
    get hasMoreBridgesHistory() {
      return runeStoreRef.value.hasMoreBridgesHistory;
    },
    get isLoadingBridgesHistory() {
      return runeStoreRef.value.isLoadingBridgesHistory;
    },
    get bridgesHistoryError() {
      return runeStoreRef.value.bridgesHistoryError;
    },
    loadMoreBridgesHistory: mockRuneLoadMoreBridgesHistory,
    setRuneId: mockRuneSetRuneId,
  },
}));

import TokenTransactionHistory from "./tokenTransactionHistory.svelte";

function fixture_of_btc_token(
  overrides: Partial<TokenWithPriceAndBalance> = {},
): TokenWithPriceAndBalance {
  return {
    address: "mxzaz-hqaaa-aaaar-qaada-cai",
    name: "ckBTC",
    symbol: "ckBTC",
    decimals: 8,
    balance: 0n,
    balanceUSD: 0,
    priceUSD: 1,
    enabled: true,
    fee: 10n,
    is_default: false,
    isRune: false,
    runeInfo: undefined,
    indexId: "btc-index-id",
    ...overrides,
  } as TokenWithPriceAndBalance;
}

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
    priceUSD: 2,
    enabled: true,
    fee: 10n,
    is_default: false,
    isRune: true,
    runeInfo: {
      runeId: "UNCOMMON•GOODS",
      tokenId: "omnity-rune-id",
    },
    indexId: "rune-index-id",
    ...overrides,
  } as TokenWithPriceAndBalance;
}

function fixture_of_bridge(overrides: Record<string, unknown> = {}) {
  return {
    bridge_id: "bridge-1",
    icp_address: "aaaaa-aa",
    btc_address: "tb1qbridge",
    created_at_ts: 1_704_067_200n,
    total_amount: 250_000_000n,
    total_amount_usd: 2.5,
    bridge_type: BridgeType.Import,
    status: BridgeTransactionStatus.Completed,

    btc_fee: 0n,
    btc_txid: "bridge-btc-txid",
    block_id: null,
    block_timestamp: null,
    confirmations: [],
    vin: [],
    vout: [],
    retry_times: 0,
    details: {
      kind: "ckbtc",
      ckbtc_block_id: null,
      deposit_fee_btc_sats: null,
      withdrawal_fee_btc_sats: null,
    },
    asset_infos: [
      {
        asset_type: "BTC",
        asset_id: "UTXO",
        amount: 250_000_000n,
        decimals: 8,
      },
    ],
    ...overrides,
  } as BridgeTransactionWithUsdValue;
}

describe("TokenTransactionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    historyStoreRef.value = {
      transactions: [],
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      error: undefined,
      loadMore: mockWalletHistoryLoadMore,
    };
    btcStoreRef.value = {
      bridgesHistory: [],
      hasMoreBridgesHistory: false,
      isLoadingBridgesHistory: false,
      bridgesHistoryError: undefined,
      minConfirmations: 6,
    };
    runeStoreRef.value = {
      bridgesHistory: [],
      hasMoreBridgesHistory: false,
      isLoadingBridgesHistory: false,
      bridgesHistoryError: undefined,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("it_should_use_btc_bridge_store_history_and_load_more_from_stores", async () => {
    historyStoreRef.value.transactions = [
      {
        id: 1n,
        kind: TransactionKind.TRANSFER,
        amount: 100_000_000n,
        timestampMs: 1_704_067_100_000,
        from: "aaaaa-aa",
        to: "bbbbbb-bb",
      },
    ];
    historyStoreRef.value.hasMore = true;
    btcStoreRef.value.bridgesHistory = [
      fixture_of_bridge({
        bridge_id: "bridge-export",
        created_at_ts: 1_704_067_300n,
        bridge_type: "Export",
        status: "Completed",
      }),
    ];
    btcStoreRef.value.hasMoreBridgesHistory = true;

    render(TokenTransactionHistory, {
      props: {
        tokenAddress: "mxzaz-hqaaa-aaaar-qaada-cai",
        tokenDetails: fixture_of_btc_token(),
      },
    });

    expect(mockGetBridgeTransactions).not.toHaveBeenCalled();
    expect(mockRuneSetRuneId).toHaveBeenCalledWith(null);

    const transactionButtons = screen.getAllByRole("button").slice(0, 2);
    expect(transactionButtons[0].textContent).toContain(
      "bitcoin.send.exported",
    );
    expect(transactionButtons[1].textContent).toContain(
      "wallet.tokenInfo.sent",
    );

    await fireEvent.click(screen.getByText("wallet.tokenInfo.loadMore"));

    expect(mockWalletHistoryLoadMore).toHaveBeenCalledTimes(1);
    expect(mockBtcLoadMoreBridgesHistory).toHaveBeenCalledTimes(1);
  });

  it("it_should_use_rune_bridge_store_history_and_manage_rune_id_lifecycle", async () => {
    runeStoreRef.value.bridgesHistory = [
      fixture_of_bridge({
        bridge_id: "bridge-rune-import",
        bridge_type: "Import",
        status: "Pending",
      }),
    ];

    const view = render(TokenTransactionHistory, {
      props: {
        tokenAddress: "rune-ledger-id",
        tokenDetails: fixture_of_rune_token(),
      },
    });

    expect(mockGetBridgeTransactions).not.toHaveBeenCalled();
    expect(mockRuneSetRuneId).toHaveBeenCalledWith("UNCOMMON•GOODS");
    expect(screen.getByText("bitcoin.receive.importing")).toBeInTheDocument();

    await view.rerender({
      tokenAddress: "mxzaz-hqaaa-aaaar-qaada-cai",
      tokenDetails: fixture_of_btc_token(),
    });

    expect(mockRuneSetRuneId).toHaveBeenCalledWith(null);
  });

  it("it_should_show_created_label_for_created_export_bridge", () => {
    btcStoreRef.value.bridgesHistory = [
      fixture_of_bridge({
        bridge_id: "bridge-export-created",
        bridge_type: "Export",
        status: "Created",
      }),
    ];

    render(TokenTransactionHistory, {
      props: {
        tokenAddress: "mxzaz-hqaaa-aaaar-qaada-cai",
        tokenDetails: fixture_of_btc_token(),
      },
    });

    expect(screen.getByText("bitcoin.send.created")).toBeInTheDocument();
    expect(
      screen.queryByText("bitcoin.send.exporting"),
    ).not.toBeInTheDocument();
  });
});
