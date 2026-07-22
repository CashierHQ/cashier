<script lang="ts">
  import { locale } from "$lib/i18n";
  import { WalletTab } from "$modules/wallet/types";
  import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    SlidersHorizontal,
  } from "lucide-svelte";

  type Props = {
    activeTab: WalletTab;
    onSend: () => void;
    onReceive: () => void;
    onSwap: () => void;
    onManageNfts: () => void;
  };

  let { activeTab, onSend, onReceive, onSwap, onManageNfts }: Props = $props();

  const actionIconClass = $derived(
    activeTab === WalletTab.NFTS
      ? "bg-walletlightpurple text-walletpurple"
      : "bg-lightgreen text-gray-900",
  );
</script>

<div class="mx-auto flex max-w-md justify-center gap-8">
  <button
    type="button"
    onclick={onSend}
    class="flex cursor-pointer flex-col items-center gap-1.5 transition-transform active:scale-95"
  >
    <div
      class="flex h-10 w-10 items-center justify-center rounded-full transition-colors {actionIconClass}"
    >
      <ArrowUp size={21} />
    </div>
    <span class="text-xs text-gray-500"
      >{locale.t("wallet.navBar.sendBtn")}</span
    >
  </button>

  <button
    type="button"
    onclick={onReceive}
    class="flex cursor-pointer flex-col items-center gap-1.5 transition-transform active:scale-95"
  >
    <div
      class="flex h-10 w-10 items-center justify-center rounded-full transition-colors {actionIconClass}"
    >
      <ArrowDown size={21} />
    </div>
    <span class="text-xs text-gray-500"
      >{locale.t("wallet.navBar.receiveBtn")}</span
    >
  </button>

  {#if activeTab === WalletTab.NFTS}
    <button
      type="button"
      onclick={onManageNfts}
      class="flex cursor-pointer flex-col items-center gap-1.5 transition-transform active:scale-95"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors {actionIconClass}"
      >
        <SlidersHorizontal size={21} />
      </div>
      <span class="text-xs text-gray-500"
        >{locale.t("wallet.navBar.manageBtn")}</span
      >
    </button>
  {:else}
    <button
      type="button"
      onclick={onSwap}
      class="flex cursor-pointer flex-col items-center gap-1.5 transition-transform active:scale-95"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors {actionIconClass}"
      >
        <ArrowUpDown size={21} />
      </div>
      <span class="text-xs text-gray-500"
        >{locale.t("wallet.navBar.swapBtn")}</span
      >
    </button>
  {/if}
</div>
