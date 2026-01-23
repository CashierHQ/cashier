<script lang="ts">
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { TokenIcon } from "$modules/imageCache";
  import { toast } from "svelte-sonner";
  import { locale } from "$lib/i18n";
  import { LoaderCircle, RefreshCw, Search, Plus } from "lucide-svelte";
  import { MOCK_NETWORKS } from "$modules/wallet/mock/mock";
  import { SvelteMap } from "svelte/reactivity";

  type Props = {
    onNavigateBack: () => void;
    onNavigateToImport: () => void;
    isToggling?: boolean;
  };

  let {
    onNavigateBack,
    onNavigateToImport,
    isToggling = $bindable(false),
  }: Props = $props();

  let searchQuery: string = $state("");
  let failedImageLoads: Set<string> = $state(new Set());
  let failedNetworkIconLoads: Set<string> = $state(new Set());
  let isRefreshing: boolean = $state(false);
  let optimisticUpdates = new SvelteMap<string, boolean>();
  let updateTrigger = $state(0);

  $effect(() => {
    if (!walletStore.query.data) return;

    for (const [address, optimisticEnabled] of optimisticUpdates) {
      const serverToken = walletStore.query.data.find(
        (t) => t.address === address,
      );
      if (serverToken && serverToken.enabled === optimisticEnabled) {
        optimisticUpdates.delete(address);
      }
    }
  });

  async function handleToggle(token: TokenWithPriceAndBalance) {
    if (token.is_default) return;

    const originalEnabled = token.enabled;
    const newEnabled = !token.enabled;


    optimisticUpdates.set(token.address, newEnabled);
    updateTrigger++;

    walletStore
      .toggleToken(token.address, newEnabled)
      .then(async () => {
        await walletStore.query.refresh();

      })
      .catch(async (error) => {

        optimisticUpdates.set(token.address, originalEnabled);
        toast.error(locale.t("wallet.manage.toggleError") + ": " + error);
        await walletStore.query.refresh();
      });
  }

  async function handleRefresh() {
    isRefreshing = true;

    try {
      await walletStore.query.refresh();
    } catch (e) {
      toast.error(locale.t("wallet.manage.refreshError") + ": " + e);
    }

    isRefreshing = false;
  }

  function handleImport() {
    onNavigateToImport();
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
    failedImageLoads = failedImageLoads;
  }

  function handleNetworkIconError(address: string) {
    failedNetworkIconLoads.add(address);
    failedNetworkIconLoads = failedNetworkIconLoads;
  }

  // TODO: Get network from token data instead of defaulting to ICP
  function getTokenNetwork(token: TokenWithPriceAndBalance) {
    // Default to ICP for now
    return token.address.startsWith("icp")
      ? MOCK_NETWORKS[0]
      : MOCK_NETWORKS[0];
  }

  const filteredTokens = $derived.by(() => {
    void updateTrigger;
    return (
      walletStore.query.data
        ?.map((token) => {
          const optimisticEnabled = optimisticUpdates.get(token.address);
          if (optimisticEnabled !== undefined) {
            return { ...token, enabled: optimisticEnabled };
          }
          return token;
        })
        .filter(
          (token) =>
            token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            token.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
        ) || []
    );
  });
</script>

<div>
  <NavBar
    mode="back-only"
    title={locale.t("wallet.manage.header")}
    onBack={onNavigateBack}
  />

  <div>
    <!-- Header -->
    <div class="bg-white sticky top-0 z-10">
      <div class="px-4 py-3">
        <div class="flex gap-2 items-center">
          <div class="relative flex-1">
            <Search
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green"
            />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder={locale.t("wallet.manage.searchPlaceholder")}
              class="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-teal-500 text-gray-900 placeholder-gray-400"
            />
          </div>
          <button
            onclick={handleImport}
            class="w-[54px] h-[54px] rounded-xl border border-gray-200 flex items-center justify-center bg-white transition-colors"
            aria-label={locale.t("wallet.manage.importButtonAria")}
          >
            <Plus class="w-6 h-6 text-green" />
          </button>
          <button
            onclick={handleRefresh}
            disabled={isRefreshing}
            class="w-[54px] h-[54px] rounded-xl border border-gray-200 flex items-center justify-center transition-all disabled:cursor-not-allowed"
            aria-label={locale.t("wallet.manage.refreshButtonAria")}
          >
            <RefreshCw
              class="text-green {isRefreshing ? 'animate-spin' : ''}"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="px-4">
      {#if walletStore.query.isSuccess && walletStore.query.data?.length && filteredTokens.length === 0}
        <div class="flex flex-col items-center justify-center py-16">
          <div
            class="w-16 h-16 rounded-[10px] border border-lightgreen flex items-center justify-center mb-4 shadow-[0_1px_2px_0_#1018280D]"
          >
            <Search class="w-8 h-8 text-green" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {locale.t("wallet.manage.emptyTitle")}
          </h3>
          <button
            onclick={handleImport}
            class="text-green font-medium hover:text-teal-700"
          >
            {locale.t("wallet.manage.importManually")}
          </button>
        </div>
      {:else if walletStore.query.data && walletStore.query.data.length}
        <div class="space-y-0">
          {#each filteredTokens as token (token.address)}
            {@const network = getTokenNetwork(token)}
            <div class="bg-white flex items-center justify-between py-3.5">
              <div class="flex items-center gap-3 flex-1">
                <div class="relative w-10 h-10">
                  <div
                    class="w-10 h-10 flex items-center justify-center flex-shrink-0"
                  >
                    <TokenIcon
                      address={token.address}
                      symbol={token.symbol}
                      size="md"
                      {failedImageLoads}
                      onImageError={handleImageError}
                      fallbackText={token.symbol.slice(0, 2)}
                    />
                  </div>
                  <!-- Network Badge -->
                  <div
                    class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center"
                    style="padding: 1px;"
                  >
                    {#if network.iconUrl && !failedNetworkIconLoads.has(token.address)}
                      <img
                        src={network.iconUrl}
                        alt={network.name}
                        class="w-full h-full rounded-full"
                        onerror={() => handleNetworkIconError(token.address)}
                      />
                    {:else}
                      <div
                        class="w-full h-full flex items-center justify-center bg-gray-500 rounded-full text-white"
                        style="font-size: 6px; font-weight: bold;"
                      >
                        {network.name[0]?.toUpperCase() || "?"}
                      </div>
                    {/if}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-900 text-[15px]">
                    {token.name}
                  </div>
                  <div class="text-sm text-gray-500">{token.symbol}</div>
                </div>
              </div>
              <button
                onclick={() => handleToggle(token)}
                disabled={token.is_default}
                class="relative inline-flex h-5 w-8 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed {token.enabled
                  ? 'bg-green'
                  : 'bg-lightgreen'}"
                aria-label={locale
                  .t("wallet.manage.toggleAria")
                  .replace("{{token}}", token.name)}
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {token.enabled
                    ? 'translate-x-3.5'
                    : 'translate-x-0.5'}"
                ></span>
              </button>
            </div>
          {/each}
        </div>
      {:else if walletStore.query.error}
        <div class="bg-red-50 text-red-600 rounded-lg p-4 text-sm mt-4">
          {locale.t("wallet.manage.errorMessage")}: {walletStore.query.error}
        </div>
      {:else}
        <div class="flex items-center justify-center py-16">
          <LoaderCircle class="h-8 w-8 text-green animate-spin" />
        </div>
      {/if}
    </div>
  </div>
</div>
