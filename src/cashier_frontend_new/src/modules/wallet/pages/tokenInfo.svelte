<script lang="ts">
  import { page } from "$app/state";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import { Copy, ArrowUpRight, ArrowDownLeft } from "lucide-svelte";
  import { shortenAddress } from "$modules/wallet/utils/address";
  import { MOCK_TRANSACTIONS } from "../constants/mock";
  import { groupTransactionsByDate } from "../utils/date";

  let token = page.params.token || "empty";
  let tokenDetails = $derived(
    walletStore.query.data?.find((t) => t.address === token),
  );

  // TODO: get actual data from api !!
  const transactions = MOCK_TRANSACTIONS;

  const transactionsByDate = $derived(groupTransactionsByDate(transactions));

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(locale.t("constants.copiedToClipboard"));
  }

  function calculateUsdValue(amount: number): number {
    if (!tokenDetails) return 0;
    return Math.abs(amount) * tokenDetails.priceUSD;
  }
</script>

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
                onclick={() => copyToClipboard(tokenDetails.address)}
                class="text-green hover:text-green/80 transition-colors flex-shrink-0"
                aria-label={locale.t("wallet.tokenInfo.copyContract")}
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
        {#each transactionsByDate as dateGroup (dateGroup.date)}
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
                  <div class="flex justify-between items-start mb-1">
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
                    <p class="text-[10px]/[100%] text-grey" title={tx.address}>
                      {tx.type === "sent"
                        ? locale.t("wallet.tokenInfo.to")
                        : locale.t("wallet.tokenInfo.from")}: {shortenAddress(
                        tx.address,
                      )}
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
