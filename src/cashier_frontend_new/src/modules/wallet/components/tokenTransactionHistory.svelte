<script lang="ts">
  import {
    createWalletHistoryStore,
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
  import { groupTransactionsByDate } from "../utils/date";
  import {
    getDisplayType,
    getTransactionLabelKey,
    isOutgoingTransaction,
  } from "../utils/transaction-display-type";
  import {
    ICP_LEDGER_CANISTER_ID,
    ICP_INDEX_CANISTER_ID,
  } from "$modules/token/constants";
  import {
    DisplayTransactionType,
    type TokenWithPriceAndBalance,
    type DisplayTransaction,
  } from "$modules/token/types";

  interface Props {
    tokenAddress: string;
    tokenDetails: TokenWithPriceAndBalance | undefined;
  }

  let { tokenAddress, tokenDetails }: Props = $props();

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

  $effect(() => {
    const indexId = getIndexId(tokenAddress, tokenDetails);
    if (indexId) {
      historyStore = createWalletHistoryStore(indexId);
    } else {
      historyStore = null;
    }
  });

  // Transform TokenTransaction[] to DisplayTransaction[] for groupTransactionsByDate
  const transactions = $derived.by((): DisplayTransaction[] => {
    if (!tokenDetails || !historyStore) return [];

    const rawTxs = historyStore.transactions;
    const userPrincipal = authState.account?.owner;

    return rawTxs.map((tx) => {
      const type = getDisplayType(
        tx.kind,
        tx.from,
        tx.to,
        tx.spender,
        userPrincipal,
      );
      return {
        type,
        amount: Number(tx.amount) / Math.pow(10, tokenDetails?.decimals ?? 8),
        timestamp: tx.timestampMs,
      };
    });
  });

  const transactionsByDate = $derived.by(() =>
    groupTransactionsByDate(transactions),
  );

  function calculateUsdValue(amount: number): number {
    if (!tokenDetails) return 0;
    return Math.abs(amount) * tokenDetails.priceUSD;
  }
</script>

<div class="space-y-4 mt-8">
  {#if !hasIndexCanister}
    <p class="text-gray-500 text-center py-4">
      {locale.t("wallet.tokenInfo.noHistoryAvailable")}
    </p>
  {:else if historyStore?.isLoading && transactions.length === 0 && !historyStore?.error}
    <div class="flex items-center justify-center py-8">
      <LoaderCircle class="w-6 h-6 text-green animate-spin" />
    </div>
  {:else if historyStore?.error}
    <p class="text-red-500 text-center py-4">
      {locale.t("wallet.tokenInfo.errorLoadingHistory")}
    </p>
  {:else if transactions.length === 0}
    <p class="text-gray-500 text-center py-4">
      {locale.t("wallet.tokenInfo.noTransactions")}
    </p>
  {:else}
    {#each transactionsByDate as dateGroup, i (i)}
      <div class="text-lightblack text-sm mb-4">
        {dateGroup.date}
      </div>

      <div class="space-y-3">
        {#each dateGroup.transactions as tx, j (j)}
          <div class="flex items-start gap-3 py-2">
            <div
              class="w-9 h-9 rounded-full bg-lightgreen flex items-center justify-center flex-shrink-0 mt-1"
            >
              {#if tx.type === DisplayTransactionType.SENT || tx.type === DisplayTransactionType.TRANSFER_FROM || tx.type === DisplayTransactionType.BURN}
                <ArrowUpRight class="w-5 h-5 text-gray-700" />
              {:else if tx.type === DisplayTransactionType.APPROVE}
                <Check class="w-5 h-5 text-gray-700" />
              {:else}
                <ArrowDownLeft class="w-5 h-5 text-gray-700" />
              {/if}
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-between h-full">
              <div class="flex justify-between items-start mb-1">
                <p class="text-[#222222]">
                  {locale.t(getTransactionLabelKey(tx.type))}
                </p>
                <p class="text-[#222222] text-right">
                  {isOutgoingTransaction(tx.type) ? "-" : "+"}{tx.amount}
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
                  ${calculateUsdValue(tx.amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/each}

    {#if historyStore?.hasMore}
      <div class="flex justify-center pt-4">
        <button
          onclick={() => historyStore?.loadMore()}
          disabled={historyStore?.isLoadingMore}
          class="px-4 py-2 text-sm text-green border border-green rounded-lg hover:bg-green/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if historyStore?.isLoadingMore}
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
