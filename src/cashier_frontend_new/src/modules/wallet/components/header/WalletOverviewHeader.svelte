<script lang="ts">
  import { locale } from "$lib/i18n";
  import { balanceToUSDValue } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import WalletActionButtons from "$modules/wallet/components/header/WalletActionButtons.svelte";
  import WalletModeTabs from "$modules/wallet/components/header/WalletModeTabs.svelte";
  import { WalletTab } from "$modules/wallet/types";
  import { Eye, EyeOff } from "lucide-svelte";

  type Props = {
    activeTab: WalletTab;
    isBalanceVisible: boolean;
    nftCount: number;
    collectionCount: number;
    onToggleBalance: () => void;
    onSend: () => void;
    onReceive: () => void;
    onSwap: () => void;
    onManageNfts: () => void;
    onTabChange: (tab: WalletTab) => void;
  };

  let {
    activeTab,
    isBalanceVisible,
    nftCount,
    collectionCount,
    onToggleBalance,
    onSend,
    onReceive,
    onSwap,
    onManageNfts,
    onTabChange,
  }: Props = $props();

  function calculateTotalBalance() {
    if (!walletStore.query.data) return 0;

    return walletStore.query.data
      .filter((token) => token.enabled)
      .reduce((total, token) => {
        return (
          total +
          balanceToUSDValue(token.balance, token.decimals, token.priceUSD)
        );
      }, 0);
  }

  let totalBalance = $derived.by(() => calculateTotalBalance());
</script>

<header class="border-b border-[#E5EAE8] pb-4">
  <WalletModeTabs {activeTab} {onTabChange} />

  <div class="mt-8 text-center">
    {#if activeTab === WalletTab.NFTS}
      <h2 class="text-[38px]/[100%] font-semibold text-[#242424]">
        {nftCount}
        {locale.t("wallet.nfts.summaryTitle")}
      </h2>
      <p class="mt-1 text-lg leading-none text-grey">
        {locale.t("wallet.nfts.collectionsPrefix")}
        {collectionCount}
        {locale.t("wallet.nfts.collectionsSuffix")}
      </p>
    {:else}
      <div class="relative mx-auto w-fit">
        <h2 class="text-[38px]/[100%] font-semibold text-[#242424]">
          {#if isBalanceVisible}
            ${totalBalance.toFixed(2)}
          {:else}
            ****
          {/if}
        </h2>
        <button
          type="button"
          onclick={onToggleBalance}
          class="absolute top-1/2 right-[-36px] -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700 active:scale-95"
          aria-label={locale.t("wallet.navBar.toggleBalance")}
        >
          {#if isBalanceVisible}
            <Eye size={24} />
          {:else}
            <EyeOff size={24} />
          {/if}
        </button>
      </div>
    {/if}
  </div>

  <div class="mt-6">
    <WalletActionButtons
      {activeTab}
      {onSend}
      {onReceive}
      {onSwap}
      {onManageNfts}
    />
  </div>
</header>
