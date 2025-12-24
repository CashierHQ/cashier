<script lang="ts">
  import { page } from "$app/state";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import { Copy, LoaderCircle } from "lucide-svelte";
  import TokenTransactionHistory from "../components/tokenTransactionHistory.svelte";

  let token = $derived(page.params.token || "empty");
  let tokenDetails = $derived(
    walletStore.query.data?.find((t) => t.address === token),
  );

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(locale.t("constants.copiedToClipboard"));
  }
</script>

<NavBar />

<div class="px-4 pb-6">
  {#if walletStore.query.isLoading && !walletStore.query.data}
    <div class="text-center py-12 space-y-4">
      <LoaderCircle class="w-10 h-10 animate-spin mx-auto mb-4" />
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {:else if tokenDetails}
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

      <TokenTransactionHistory tokenAddress={token} {tokenDetails} />
    </div>
  {:else}
    <div class="text-center py-12">
      <p class="text-red-600 text-lg">
        {locale.t("wallet.tokenInfo.noDetails")}
      </p>
    </div>
  {/if}
</div>
