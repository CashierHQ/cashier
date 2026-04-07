<script lang="ts">
  import {
    getWalletHistoryStore,
    type WalletHistoryStore,
  } from "$modules/token/state/walletHistoryStore.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { locale } from "$lib/i18n";
  import {
    ArrowUpRight,
    ArrowDownLeft,
    Check,
    LoaderCircle,
  } from "lucide-svelte";
  import { formatDate, getDateKey } from "$modules/wallet/utils/date";
  import { getTransactionLabelKey } from "$modules/wallet/utils/transactionDisplayType";
  import {
    CKBTC_CANISTER_ID,
    ICP_LEDGER_CANISTER_ID,
    ICP_INDEX_CANISTER_ID,
  } from "$modules/token/constants";
  import {
    TransactionKind,
    type TokenWithPriceAndBalance,
    type TransactionKindValue,
    DisplayTransactionMapper,
  } from "$modules/token/types/index";
  import {
    BridgeTransactionStatus,
    BridgeType,
    type BridgeTransaction,
  } from "$modules/bitcoin/types/bridge_transaction";
  import { btcBridgeStore } from "$modules/bitcoin/state/btcBridgeStore.svelte";
  import { runeBridgeStore } from "$modules/bitcoin/state/runeBridgeStore.svelte";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type { BridgeSource } from "$modules/transactionCart/types/transactionSource";
  import { SvelteMap } from "svelte/reactivity";

  interface Props {
    tokenAddress: string;
    tokenDetails: TokenWithPriceAndBalance | undefined;
  }

  let { tokenAddress, tokenDetails }: Props = $props();

  type HistoryItem = {
    id: string;
    kind: TransactionKindValue;
    isOutgoing: boolean;
    amount: number;
    timestamp: number;
    label: string;
    usdValue: number;
    bridge?: BridgeTransaction;
  };

  // Resolve indexId for token (ICP uses constant, others use tokenDetails.indexId)
  function getIndexId(
    address: string,
    details: TokenWithPriceAndBalance | undefined,
  ): string | undefined {
    if (address === ICP_LEDGER_CANISTER_ID) {
      return ICP_INDEX_CANISTER_ID;
    }
    return details?.indexId;
  }

  // Check if token has index canister (ICP always has one)
  let hasIndexCanister = $derived.by(() => {
    if (!tokenDetails) return false;
    return (
      tokenDetails.address === ICP_LEDGER_CANISTER_ID || !!tokenDetails.indexId
    );
  });

  // Create store when indexId is available, recreate when token changes
  let historyStore = $state<WalletHistoryStore | null>(null);
  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);
  const isCkBtc = $derived(tokenAddress === CKBTC_CANISTER_ID);
  const isRune = $derived(!!tokenDetails?.isRune && !!tokenDetails?.runeInfo);
  const minConfirmations = $derived.by(() => btcBridgeStore.minConfirmations);

  function getBridgeLabel(bridge: BridgeTransaction): string {
    if (bridge.bridge_type === BridgeType.Import) {
      return bridge.status === BridgeTransactionStatus.Completed
        ? locale.t("bitcoin.receive.imported")
        : locale.t("bitcoin.receive.importing");
    }

    return bridge.status === BridgeTransactionStatus.Completed
      ? locale.t("bitcoin.send.exported")
      : locale.t("bitcoin.send.exporting");
  }

  $effect(() => {
    const indexId = getIndexId(tokenAddress, tokenDetails);
    if (indexId) {
      historyStore = getWalletHistoryStore(indexId);
    } else {
      historyStore = null;
    }
  });

  $effect(() => {
    if (!isRune) {
      runeBridgeStore.setRuneId(null);
      return;
    }

    const runeId = tokenDetails?.runeInfo?.runeId ?? null;
    runeBridgeStore.setRuneId(runeId);

    return () => {
      runeBridgeStore.setRuneId(null);
    };
  });

  const bridgeTransactions = $derived.by(() => {
    if (isCkBtc) {
      return btcBridgeStore.bridgesHistory;
    }

    if (isRune) {
      return runeBridgeStore.bridgesHistory;
    }

    return [];
  });

  const bridgeHasMore = $derived.by(() => {
    if (isCkBtc) {
      return btcBridgeStore.hasMoreBridgesHistory;
    }

    if (isRune) {
      return runeBridgeStore.hasMoreBridgesHistory;
    }

    return false;
  });

  const bridgeIsLoading = $derived.by(() => {
    if (isCkBtc) {
      return btcBridgeStore.isLoadingBridgesHistory;
    }

    if (isRune) {
      return runeBridgeStore.isLoadingBridgesHistory;
    }

    return false;
  });

  const bridgeError = $derived.by(() => {
    if (isCkBtc) {
      return btcBridgeStore.bridgesHistoryError;
    }

    if (isRune) {
      return runeBridgeStore.bridgesHistoryError;
    }

    return undefined;
  });

  // Transform TokenTransaction[] to DisplayTransaction[]
  const transactions = $derived.by((): HistoryItem[] => {
    const tokenTransactions = DisplayTransactionMapper.fromTokenTransaction(
      historyStore?.transactions || [],
      authState.account?.owner,
      tokenDetails,
    ).map((tx, index) => ({
      id: `token-${historyStore?.transactions[index]?.id.toString() ?? index}`,
      kind: tx.kind,
      isOutgoing: tx.isOutgoing,
      amount: tx.amount,
      timestamp: tx.timestamp,
      label: locale.t(getTransactionLabelKey(tx.kind, tx.isOutgoing)),
      usdValue: calculateUsdValue(tx.amount),
    }));

    const bridgeHistory =
      isCkBtc || isRune
        ? bridgeTransactions.map((bridge) => {
            const amount = bridge.total_amount
              ? Number(bridge.total_amount) /
                10 ** (tokenDetails?.decimals ?? 8)
              : 0;

            return {
              id: `bridge-${bridge.bridge_id}`,
              kind: TransactionKind.TRANSFER,
              isOutgoing: bridge.bridge_type === BridgeType.Export,
              amount,
              timestamp: Number(bridge.created_at_ts) * 1000,
              label: getBridgeLabel(bridge),
              usdValue: calculateUsdValue(amount),
              bridge,
            };
          })
        : [];

    return [...tokenTransactions, ...bridgeHistory].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  });

  const transactionsByDate = $derived.by(() => {
    const grouped = new SvelteMap<string, HistoryItem[]>();

    transactions.forEach((tx) => {
      const dateKey = getDateKey(tx.timestamp);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(tx);
    });

    return Array.from(grouped.entries()).map(([, txs]) => ({
      date: formatDate(txs[0].timestamp),
      transactions: txs,
    }));
  });

  function calculateUsdValue(amount: number): number {
    if (!tokenDetails) return 0;
    return Math.abs(amount) * tokenDetails.priceUSD;
  }

  async function handleLoadMore() {
    const tasks: Promise<void>[] = [];

    if (historyStore?.hasMore) {
      tasks.push(historyStore.loadMore());
    }

    if ((isCkBtc || isRune) && bridgeHasMore && !bridgeIsLoading) {
      tasks.push(
        Promise.resolve(
          isCkBtc
            ? btcBridgeStore.loadMoreBridgesHistory()
            : runeBridgeStore.loadMoreBridgesHistory(),
        ),
      );
    }

    await Promise.all(tasks);
  }

  function handleSelectBridge(bridge: BridgeTransaction) {
    showBridgeTxCart = true;
    bridgeSource = { bridge };
  }

  function handleCloseBridgeTxCart() {
    showBridgeTxCart = false;
    bridgeSource = null;
  }
</script>

<div class="space-y-4 mt-8">
  {#if !hasIndexCanister && !isCkBtc && !isRune}
    <p class="text-gray-500 text-center py-4">
      {locale.t("wallet.tokenInfo.noHistoryAvailable")}
    </p>
  {:else if (historyStore?.isLoading || bridgeIsLoading) && transactions.length === 0 && !historyStore?.error && !bridgeError}
    <div class="flex items-center justify-center py-8">
      <LoaderCircle class="w-6 h-6 text-green animate-spin" />
    </div>
  {:else if historyStore?.error || bridgeError}
    <p class="text-red-500 text-center py-4">
      {locale.t("wallet.tokenInfo.errorLoadingHistory")}
    </p>
  {:else if transactions.length === 0}
    <p class="text-center py-4 font-medium">
      {locale.t("wallet.tokenInfo.noTransactions")}
    </p>
  {:else}
    {#each transactionsByDate as dateGroup, i (i)}
      <div class="text-lightblack text-sm mb-4">
        {dateGroup.date}
      </div>

      <div class="space-y-3">
        {#each dateGroup.transactions as tx, j (j)}
          <button
            type="button"
            class="w-full text-left"
            onclick={() => tx.bridge && handleSelectBridge(tx.bridge)}
            disabled={!tx.bridge}
          >
            <div class="flex items-start gap-3 py-2">
              <div
                class="w-9 h-9 rounded-full bg-lightgreen flex items-center justify-center flex-shrink-0 mt-1"
              >
                {#if tx.kind === TransactionKind.APPROVE}
                  <Check class="w-5 h-5 text-gray-700" />
                {:else if tx.isOutgoing}
                  <ArrowUpRight class="w-5 h-5 text-gray-700" />
                {:else}
                  <ArrowDownLeft class="w-5 h-5 text-gray-700" />
                {/if}
              </div>

              <div class="flex-1 min-w-0 flex flex-col justify-between h-full">
                <div class="flex justify-between items-start mb-1">
                  <p class="text-[#222222]">
                    {tx.label}
                  </p>
                  <p class="text-[#222222] text-right">
                    {tx.isOutgoing ? "-" : "+"}{tx.amount}
                  </p>
                </div>
                <div class="flex justify-between items-start">
                  <p class="text-[10px]/[100%] text-grey">
                    {new Date(tx.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p class="text-[10px]/[100%] text-grey text-right">
                    ${tx.usdValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/each}

    {#if historyStore?.hasMore || ((isCkBtc || isRune) && bridgeHasMore)}
      <div class="flex justify-center pt-4">
        <button
          onclick={handleLoadMore}
          disabled={historyStore?.isLoadingMore || bridgeIsLoading}
          class="px-4 py-2 text-sm text-green border border-green rounded-lg hover:bg-green/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if historyStore?.isLoadingMore || bridgeIsLoading}
            <LoaderCircle class="w-4 h-4 animate-spin" />
            {locale.t("wallet.tokenInfo.loading")}
          {:else}
            {locale.t("wallet.tokenInfo.loadMore")}
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>

{#if showBridgeTxCart && bridgeSource}
  <BridgeTxCart
    bind:isOpen={showBridgeTxCart}
    source={bridgeSource}
    {minConfirmations}
    onCloseDrawer={handleCloseBridgeTxCart}
  />
{/if}
