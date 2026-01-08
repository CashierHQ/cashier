<script lang="ts">
  import { locale } from "$lib/i18n";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from '$modules/token/types';
  import TokenList from "$modules/wallet/components/token/tokenList.svelte";
  import { WalletTab } from "$modules/wallet/types";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    onNavigateToToken: (token: string) => void;
    onNavigateToManage: () => void;
    onNavigateToSend: () => void;
    onNavigateToReceive: () => void;
    onNavigateToSwap: () => void;
  };

  let {
    onNavigateToToken,
    onNavigateToManage,
    onNavigateToSend,
    onNavigateToReceive,
    onNavigateToSwap,
  }: Props = $props();

  let failedImageLoads = new SvelteSet<string>();
  let currentTab = $state<WalletTab>(WalletTab.TOKENS);
  
  const BALANCE_VISIBILITY_KEY = "wallet_balance_visible";
  let balanceVisible = $state(
    typeof window !== "undefined" &&
      localStorage.getItem(BALANCE_VISIBILITY_KEY) !== null
      ? localStorage.getItem(BALANCE_VISIBILITY_KEY) === "true"
      : true,
  );

  $effect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(BALANCE_VISIBILITY_KEY, String(balanceVisible));
    }
  });

  function handleToggle() {
    balanceVisible = !balanceVisible;
  }

  function handleSelectToken(address: string) {
    onNavigateToToken(address);
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  function handleManageTokens() {
    onNavigateToManage();
  }

  function handleTabChange(tab: WalletTab) {
    currentTab = tab;
  }

  const enabledTokens: TokenWithPriceAndBalance[] = $derived.by(() => {
    if (!walletStore.query.data) return [];
    return walletStore.query.data.filter((token) => token.enabled);
  });
</script>

<NavBar
  mode="default"
  activeTab={currentTab}
  isBalanceVisible={balanceVisible}
  onToggleBalance={handleToggle}
  onSend={onNavigateToSend}
  onReceive={onNavigateToReceive}
  onSwap={onNavigateToSwap}
  onTabChange={handleTabChange}
/>

<div class="px-4 pb-6">
  {#if currentTab === WalletTab.TOKENS}
    {#if walletStore.query.data}
      <TokenList
        tokens={enabledTokens}
        balanceVisible={balanceVisible}
        onSelectToken={handleSelectToken}
        onImageError={handleImageError}
        {failedImageLoads}
      />

      <div class="mt-6 text-center">
        <button
          onclick={handleManageTokens}
          class="text-green hover:text-teal-700 font-medium text-base transition-colors"
        >
          {locale.t("wallet.manageTokensBtn")}
        </button>
      </div>
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
  {:else if currentTab === WalletTab.NFTS}
    <div class="text-center py-8">
      <p class="text-gray-500">{locale.t("wallet.nftMessage")}</p>
    </div>
  {/if}
</div>
