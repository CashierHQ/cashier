<script lang="ts">
  import { locale } from "$lib/i18n";
  import { WalletTab } from "$modules/wallet/types";
  import { Coins, Image } from "lucide-svelte";

  type Props = {
    activeTab: WalletTab;
    onTabChange: (tab: WalletTab) => void;
  };

  let { activeTab, onTabChange }: Props = $props();
</script>

<div
  class="mx-auto grid h-10 w-full max-w-[290px] grid-cols-2 rounded-full border border-gray-100 bg-white p-0.5 shadow-[0_1px_3px_0_rgba(16,24,40,0.08)]"
>
  <button
    type="button"
    onclick={() => onTabChange(WalletTab.TOKENS)}
    class="flex cursor-pointer items-center justify-center gap-1.5 rounded-full text-base font-semibold transition-colors"
    class:bg-lightgreen={activeTab === WalletTab.TOKENS}
    class:text-green={activeTab === WalletTab.TOKENS}
    class:text-grey={activeTab !== WalletTab.TOKENS}
    aria-pressed={activeTab === WalletTab.TOKENS}
  >
    {#if activeTab === WalletTab.TOKENS}
      <Coins size={18} />
    {/if}
    <span>{locale.t("wallet.navBar.tokensTabBtn")}</span>
  </button>

  <button
    type="button"
    onclick={() => onTabChange(WalletTab.NFTS)}
    class="flex cursor-pointer items-center justify-center gap-1.5 rounded-full text-base font-semibold transition-colors"
    class:bg-walletlightpurple={activeTab === WalletTab.NFTS}
    class:text-walletpurple={activeTab === WalletTab.NFTS}
    class:text-grey={activeTab !== WalletTab.NFTS}
    aria-pressed={activeTab === WalletTab.NFTS}
  >
    {#if activeTab === WalletTab.NFTS}
      <Image size={18} />
    {/if}
    <span>{locale.t("wallet.navBar.nftsTabBtn")}</span>
  </button>
</div>
