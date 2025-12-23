<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { SvelteSet } from "svelte/reactivity";
  import TokenItem from "$modules/creationLink/components/shared/TokenItem.svelte";
  import { locale } from "$lib/i18n";

  let failedImageLoads = new SvelteSet<string>();
  let currentTab = $state<"tokens" | "nfts">("tokens");
  let balanceVisible = $state(true);

  function handleToggle() {
    balanceVisible = !balanceVisible;
  }

  function handleSelectToken(address: string) {
    goto(resolve(`/wallet/${address}`));
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  function handleManageTokens() {
    goto(resolve("/wallet/manage"));
  }

  const enabledTokens = $derived.by(() => {
    if (!walletStore.query.data) return [];
    return walletStore.query.data.filter((token) => token.enabled);
  });
</script>

<NavBar
  bind:activeTab={currentTab}
  isBalanceVisible={balanceVisible}
  onToggleBalance={handleToggle}
/>

<div class="px-4 pb-6">
  {#if walletStore.query.data}
    {#if enabledTokens.length > 0}
      <ul class="space-y-0">
        {#each enabledTokens as token (token.address)}
          <TokenItem
            {token}
            onSelect={handleSelectToken}
            {failedImageLoads}
            onImageError={handleImageError}
            isBalanceHidden={!balanceVisible}
          />
        {/each}
      </ul>

      <div class="mt-6 text-center">
        <button
          onclick={handleManageTokens}
          class="text-green hover:text-teal-700 font-medium text-base transition-colors"
        >
          {locale.t("wallet.manageTokensBtn")}
        </button>
      </div>
    {:else}
      <div class="text-center py-8">
        <p class="text-gray-500 mb-4">
          {locale.t("wallet.noTokensMsg")}
        </p>
        <button
          onclick={handleManageTokens}
          class="text-green hover:text-teal-700 font-medium transition-colors"
        >
          {locale.t("wallet.manageTokensBtn")}
        </button>
      </div>
    {/if}
  {:else if walletStore.query.error}
    <div class="text-center py-8">
      <p class="text-red-600 mb-4">
        {locale.t("wallet.errorMsg")}
        {walletStore.query.error}
      </p>
    </div>
  {:else}
    <div class="text-center py-8">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {/if}
</div>
