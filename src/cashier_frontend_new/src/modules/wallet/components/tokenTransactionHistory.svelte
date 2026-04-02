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
  import { tokenStorageService } from "$modules/token/services/tokenStorage";
  import { BRIDGE_PAGE_SIZE } from "$modules/bitcoin/constants";
  import {
    BridgeTransactionStatus,
    BridgeType,
    type BridgeTransaction,
  } from "$modules/bitcoin/types/bridge_transaction";
  import { btcBridgeStore } from "$modules/bitcoin/state/btcBridgeStore.svelte";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type { BridgeSource } from "$modules/transactionCart/types/transactionSource";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";

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
  let bridgeTransactions = $state<BridgeTransaction[]>([]);
  let bridgeHasMore = $state(true);
  let bridgeIsLoading = $state(false);
  let bridgeIsLoadingMore = $state(false);
  let bridgeError = $state<string | null>(null);
  let bridgePage = $state(0);
  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);
  const isCkBtc = $derived(tokenAddress === CKBTC_CANISTER_ID);
  const isRune = $derived(!!tokenDetails?.isRune && !!tokenDetails?.runeInfo);
  const minConfirmations = $derived.by(() => btcBridgeStore.minConfirmations);

  function matchesSelectedBridgeToken(bridge: BridgeTransaction): boolean {
    if (isCkBtc) {
      return bridge.asset_infos.some((asset) => asset.asset_type === "BTC");
    }

    if (isRune && tokenDetails?.runeInfo) {
      return bridge.asset_infos.some(
        (asset) =>
          asset.asset_type === "Runes" &&
          asset.asset_id === tokenDetails.runeInfo?.runeId,
      );
    }

    return false;
  }

  async function loadBridgeTransactions(page: number, append: boolean) {
    if (!isCkBtc && !isRune) {
      bridgeTransactions = [];
      bridgeHasMore = false;
      bridgeError = null;
      return;
    }

    if (append) {
      bridgeIsLoadingMore = true;
    } else {
      bridgeIsLoading = true;
    }
    bridgeError = null;

    try {
      const start = page * BRIDGE_PAGE_SIZE;
      const fetched = await tokenStorageService.getBridgeTransactions(
        start,
        BRIDGE_PAGE_SIZE,
      );
      const filtered = fetched.filter((bridge) =>
        matchesSelectedBridgeToken(bridge),
      );

      bridgeHasMore = fetched.length >= BRIDGE_PAGE_SIZE;
      if (append) {
        const existingIds = new SvelteSet(
          bridgeTransactions.map((bridge) => bridge.bridge_id),
        );
        bridgeTransactions = [
          ...bridgeTransactions,
          ...filtered.filter((bridge) => !existingIds.has(bridge.bridge_id)),
        ];
      } else {
        bridgeTransactions = filtered;
      }
      bridgePage = page;
    } catch (error) {
      bridgeError = String(error);
    } finally {
      bridgeIsLoading = false;
      bridgeIsLoadingMore = false;
    }
  }

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
    if (isCkBtc || isRune) {
      void loadBridgeTransactions(0, false);
    } else {
      bridgeTransactions = [];
      bridgeHasMore = false;
      bridgeIsLoading = false;
      bridgeIsLoadingMore = false;
      bridgeError = null;
      bridgePage = 0;
    }
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

    if ((isCkBtc || isRune) && bridgeHasMore && !bridgeIsLoadingMore) {
      tasks.push(loadBridgeTransactions(bridgePage + 1, true));
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
  {#if !hasIndexCanister && !isCkBtc}
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

    {#if historyStore?.hasMore || (isCkBtc && bridgeHasMore)}
      <div class="flex justify-center pt-4">
        <button
          onclick={handleLoadMore}
          disabled={historyStore?.isLoadingMore || bridgeIsLoadingMore}
          class="px-4 py-2 text-sm text-green border border-green rounded-lg hover:bg-green/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if historyStore?.isLoadingMore || bridgeIsLoadingMore}
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
