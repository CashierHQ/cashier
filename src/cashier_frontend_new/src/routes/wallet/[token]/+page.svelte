<script lang="ts">
  import { page } from "$app/state";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    createTokenHistoryStore,
    TokenHistoryStore,
  } from "$modules/token/state/tokenHistoryStore.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import {
    mapTransactionToUI,
    groupTransactionsByDate,
  } from "$modules/token/utils/transaction-mapper";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import { Copy, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-svelte";
  import { shortenAddress } from "$modules/token/utils/address";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { encodeAccountID } from "$modules/token/services/icpLedger";
  import { ICP_INDEX_CANISTER_ID } from "$modules/token/constants";
  import { Principal } from "@dfinity/principal";

  let token = page.params.token || "empty";
  let tokenDetails = $derived(
    walletStore.query.data?.find((t) => t.address === token),
  );

  // History store - created when tokenDetails.indexId is available
  let historyStore = $state<TokenHistoryStore | null>(null);
  // Track current indexId to prevent unnecessary recreation
  let currentIndexId = $state<string | null>(null);

  // Initialize history store when token details and auth are ready
  // Only recreate when indexId actually changes (not on every tokenDetails update)
  $effect(() => {
    const indexId = tokenDetails?.indexId?.toText() ?? null;
    const account = authState.account;

    // Only create/recreate when indexId changes or we don't have a store yet
    if (indexId && account && indexId !== currentIndexId) {
      console.log("Creating token history store for indexId:", indexId);
      currentIndexId = indexId;
      historyStore = createTokenHistoryStore(indexId, {
        owner: account.owner,
      });
    } else if (!indexId && historyStore) {
      // Clear store if no indexId available
      currentIndexId = null;
      historyStore = null;
    }
  });

  // Compute user's AccountIdentifier for ICP transaction comparison
  let userAccountId = $derived(() => {
    if (!authState.account?.owner) return undefined;
    try {
      return encodeAccountID(Principal.fromText(authState.account.owner)) ?? undefined;
    } catch {
      return undefined;
    }
  });

  // Check if current token uses ICP index canister
  let isIcpIndex = $derived(
    tokenDetails?.indexId?.toText() === ICP_INDEX_CANISTER_ID,
  );

  // Mapped transactions for UI
  let uiTransactions = $derived(
    historyStore?.transactions.map((tx) =>
      mapTransactionToUI(
        tx,
        authState.account?.owner ?? "",
        tokenDetails?.decimals ?? 8,
        // Pass AccountIdentifier for ICP transactions
        isIcpIndex ? userAccountId() : undefined,
      ),
    ) ?? [],
  );

  // Group transactions by date
  let transactionsByDate = $derived(() => groupTransactionsByDate(uiTransactions));

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(locale.t("constants.copiedToClipboard"));
  }

  function calculateUsdValue(amount: number): number {
    if (!tokenDetails) return 0;
    return Math.abs(amount) * tokenDetails.priceUSD;
  }

  // Infinite scroll handler
  let scrollContainer: HTMLDivElement;

  function handleScroll() {
    if (!scrollContainer || !historyStore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const threshold = 100; // pixels from bottom

    if (
      scrollHeight - scrollTop - clientHeight < threshold &&
      historyStore.hasMore &&
      !historyStore.isLoadingMore
    ) {
      historyStore.loadMore();
    }
  }
</script>

<RouteGuard>
  <ProtectedAuth>
    <div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
      <AppHeader class="max-sm:hidden" />

      <div
        class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col"
      >
        <div
          class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-0 grow-1 bg-white sm:rounded-xl overflow-hidden"
        >
          <div
            bind:this={scrollContainer}
            onscroll={handleScroll}
            class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-12px)] overflow-y-auto scrollbar-hide"
          >
            <NavBar />

            <div class="px-4 pb-6">
              {#if tokenDetails}
                <div class="space-y-6">
                  <div class="pt-4">
                    <h1 class="text-lg font-normal text-green mb-2">
                      {locale.t("wallet.tokenInfo.aboutToken")}
                      {tokenDetails.symbol}
                    </h1>

                    <div class="space-y-2">
                      <div class="flex justify-between items-center">
                        <span class="text-gray-700"
                          >{locale.t("wallet.tokenInfo.tokenName")}</span
                        >
                        <span class="font-medium text-gray-900">
                          {tokenDetails.symbol}
                        </span>
                      </div>

                      <div class="flex justify-between items-center">
                        <span class="text-gray-700"
                          >{locale.t("wallet.tokenInfo.network")}</span
                        >
                        <span class="font-medium text-gray-900">
                          {locale.t("wallet.tokenInfo.internetComputer")}
                        </span>
                      </div>

                      <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span class="text-gray-700"
                            >{locale.t("wallet.tokenInfo.contract")}</span
                          >
                          <button
                            onclick={() =>
                              copyToClipboard(tokenDetails.address)}
                            class="text-green hover:text-green/80 transition-colors flex-shrink-0"
                            aria-label={locale.t(
                              "wallet.tokenInfo.copyContract",
                            )}
                          >
                            <Copy class="w-4 h-4" />
                          </button>
                        </div>
                        <span
                          title={tokenDetails.address}
                          class="font-medium text-gray-900 truncate max-w-[50%]"
                        >
                          {tokenDetails.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {#if tokenDetails.indexId}
                    <div
                      data-orientation="horizontal"
                      role="none"
                      class="shrink-0 bg-border h-[1px] w-full mb-4 mt-2 max-w-full mx-auto opacity-50"
                    ></div>

                    <div class="space-y-4 mt-8">
                      {#if historyStore?.isLoading}
                        <!-- Loading state -->
                        <div class="flex justify-center py-8">
                          <Loader2 class="w-6 h-6 animate-spin text-green" />
                        </div>
                      {:else if historyStore?.error}
                        <!-- Error state -->
                        <div class="text-center py-8">
                          <p class="text-red-600">
                            {locale.t("wallet.tokenInfo.historyError")}
                          </p>
                        </div>
                      {:else if uiTransactions.length === 0}
                        <!-- Empty state -->
                        <div class="text-center py-8">
                          <p class="text-gray-500">
                            {locale.t("wallet.tokenInfo.noTransactions")}
                          </p>
                        </div>
                      {:else}
                        <!-- Transaction list -->
                        {#each transactionsByDate() as dateGroup (dateGroup.date)}
                          <div class="text-lightblack text-sm mb-4">
                            {dateGroup.date}
                          </div>

                          <div class="space-y-3">
                            {#each dateGroup.transactions as tx (tx.id)}
                              <div class="flex items-start gap-3 py-2">
                                <div
                                  class="w-9 h-9 rounded-full bg-lightgreen flex items-center justify-center flex-shrink-0 mt-1"
                                >
                                  {#if tx.type === "sent"}
                                    <ArrowUpRight
                                      class="w-5 h-5 text-gray-700"
                                    />
                                  {:else}
                                    <ArrowDownLeft
                                      class="w-5 h-5 text-gray-700"
                                    />
                                  {/if}
                                </div>

                                <div
                                  class="flex-1 min-w-0 flex flex-col justify-between h-full"
                                >
                                  <div
                                    class="flex justify-between items-start mb-1"
                                  >
                                    <p class="text-[#222222]">
                                      {tx.type === "sent"
                                        ? locale.t("wallet.tokenInfo.sent")
                                        : locale.t("wallet.tokenInfo.received")}
                                    </p>
                                    <p class="text-[#222222] text-right">
                                      {tx.type === "sent" ? "-" : "+"}{formatNumber(
                                        tx.amount,
                                      )}
                                    </p>
                                  </div>
                                  <div
                                    class="flex justify-between items-start"
                                  >
                                    <p
                                      class="text-[10px]/[100%] text-grey"
                                      title={tx.address}
                                    >
                                      {tx.type === "sent"
                                        ? locale.t("wallet.tokenInfo.to")
                                        : locale.t(
                                            "wallet.tokenInfo.from",
                                          )}: {shortenAddress(tx.address)}
                                    </p>
                                    <p
                                      class="text-[10px]/[100%] text-grey text-right"
                                    >
                                      ${calculateUsdValue(
                                        tx.amount,
                                      ).toLocaleString("en-US", {
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

                        <!-- Load more indicator -->
                        {#if historyStore?.isLoadingMore}
                          <div class="flex justify-center py-4">
                            <Loader2 class="w-5 h-5 animate-spin text-green" />
                          </div>
                        {/if}
                      {/if}
                    </div>
                  {/if}
                </div>
              {:else}
                <div class="text-center py-12">
                  <p class="text-red-600 text-lg">
                    {locale.t("wallet.tokenInfo.noDetails")}
                  </p>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProtectedAuth>
</RouteGuard>
