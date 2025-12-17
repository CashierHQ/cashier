<script lang="ts">
  import { page } from "$app/state";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import { Copy, ArrowUpRight, ArrowDownLeft } from "lucide-svelte";
  import { shortenAddress } from "$modules/token/utils/address";
  import { SvelteMap } from "svelte/reactivity";

  let token = page.params.token || "empty";
  let tokenDetails = $derived(
    walletStore.query.data?.find((t) => t.address === token),
  );

  // TODO: get actual data from api !!
  const transactions = [
    {
      type: "sent",
      amount: 0.15432,
      address: "bc1qvgtcv8n5d48xkux7v34p8wezm3m0m0dw8t3c2sa",
      timestamp: 1727524800000,
    },
    {
      type: "received",
      amount: 0.005,
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      timestamp: 1722254400000,
    },
    {
      type: "sent",
      amount: 0.15432,
      address: "bc1q3j4k5l6m7n8p9q0r1s2t3u4v5w6x7y8z9a0b1c",
      timestamp: 1722268800000,
    },
  ];

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getDateKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  const transactionsByDate = $derived(() => {
    const grouped = new SvelteMap<string, typeof transactions>();
    const sorted = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach((tx) => {
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(locale.t("constants.copiedToClipboard"));
  }

  function calculateUsdValue(amount: number): number {
    if (!tokenDetails) return 0;
    return Math.abs(amount) * tokenDetails.priceUSD;
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

                  <div
                    data-orientation="horizontal"
                    role="none"
                    class="shrink-0 bg-border h-[1px] w-full mb-4 mt-2 max-w-full mx-auto opacity-50"
                  ></div>

                  <div class="space-y-4 mt-8">
                    {#each transactionsByDate() as dateGroup (dateGroup.date)}
                      <div class="text-lightblack text-sm mb-4">
                        {dateGroup.date}
                      </div>

                      <div class="space-y-3">
                        {#each dateGroup.transactions as tx (tx.timestamp)}
                          <div class="flex items-start gap-3 py-2">
                            <div
                              class="w-9 h-9 rounded-full bg-lightgreen flex items-center justify-center flex-shrink-0 mt-1"
                            >
                              {#if tx.type === "sent"}
                                <ArrowUpRight class="w-5 h-5 text-gray-700" />
                              {:else}
                                <ArrowDownLeft class="w-5 h-5 text-gray-700" />
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
                                  {tx.type === "sent" ? "-" : "+"}{tx.amount}
                                </p>
                              </div>
                              <div class="flex justify-between items-start">
                                <p
                                  class="text-[10px]/[100%] text-grey"
                                  title={tx.address}
                                >
                                  {tx.type === "sent"
                                    ? locale.t("wallet.tokenInfo.to")
                                    : locale.t("wallet.tokenInfo.from")}: {shortenAddress(
                                    tx.address,
                                  )}
                                </p>
                                <p
                                  class="text-[10px]/[100%] text-grey text-right"
                                >
                                  ${calculateUsdValue(tx.amount).toLocaleString(
                                    "en-US",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/each}
                  </div>
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
