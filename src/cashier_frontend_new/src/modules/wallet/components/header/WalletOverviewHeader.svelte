<script lang="ts">
  import { locale } from "$lib/i18n";
  import { balanceToUSDValue } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import WalletActionButtons from "$modules/wallet/components/header/WalletActionButtons.svelte";
  import WalletModeTabs from "$modules/wallet/components/header/WalletModeTabs.svelte";
  import {
    WALLET_TAB_SLIDE_DURATION_MS,
    WALLET_TAB_SLIDE_ENTER_FROM_LEFT_PERCENT,
    WALLET_TAB_SLIDE_ENTER_FROM_RIGHT_PERCENT,
    WALLET_TAB_SLIDE_EXIT_TO_LEFT_PERCENT,
    WALLET_TAB_SLIDE_EXIT_TO_RIGHT_PERCENT,
  } from "$modules/wallet/constants";
  import { WalletTab } from "$modules/wallet/types";
  import { horizontalSlide } from "$modules/wallet/utils/horizontalSlide";
  import { Eye, EyeOff } from "lucide-svelte";
  import { cubicOut } from "svelte/easing";

  type Props = {
    activeTab: WalletTab;
    isBalanceVisible: boolean;
    nftCount: number;
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

  const contentEnterXPercent = $derived(
    activeTab === WalletTab.NFTS
      ? WALLET_TAB_SLIDE_ENTER_FROM_RIGHT_PERCENT
      : WALLET_TAB_SLIDE_ENTER_FROM_LEFT_PERCENT,
  );
  const contentExitXPercent = $derived(
    activeTab === WalletTab.NFTS
      ? WALLET_TAB_SLIDE_EXIT_TO_LEFT_PERCENT
      : WALLET_TAB_SLIDE_EXIT_TO_RIGHT_PERCENT,
  );
</script>

<header class="border-b border-[#E5EAE8] pb-4">
  <WalletModeTabs {activeTab} {onTabChange} />

  <div class="grid overflow-hidden">
    {#key activeTab}
      <div
        class="col-start-1 row-start-1 w-full"
        in:horizontalSlide={{
          xPercent: contentEnterXPercent,
          duration: WALLET_TAB_SLIDE_DURATION_MS,
          easing: cubicOut,
        }}
        out:horizontalSlide={{
          xPercent: contentExitXPercent,
          duration: WALLET_TAB_SLIDE_DURATION_MS,
          easing: cubicOut,
        }}
      >
        <div class="mt-8 text-center">
          {#if activeTab === WalletTab.NFTS}
            <h2 class="text-[38px]/[100%] font-semibold text-[#242424]">
              {nftCount}
              {locale.t("wallet.nfts.summaryTitle")}
            </h2>
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
      </div>
    {/key}
  </div>
</header>
