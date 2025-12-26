<script lang="ts">
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    balanceToUSDValue,
    parseBalanceUnits,
  } from "$modules/shared/utils/converter";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import {
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    ChevronLeft,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { locale } from "$lib/i18n";

  type Token = {
    address: string;
    symbol: string;
    balance: bigint;
    decimals: number;
    priceUSD: number;
    enabled: boolean;
  };

  type Props = {
    // View mode
    mode?: "default" | "token" | "back-only";

    // Token data (for token view)
    token?: Token;

    // Balance visibility
    isBalanceVisible?: boolean;
    onToggleBalance?: () => void;

    // Actions
    onSend?: () => void;
    onReceive?: () => void;
    onSwap?: () => void;
    onBack?: () => void;

    // Tabs (for default view)
    activeTab?: "tokens" | "nfts";
    onTabChange?: (tab: "tokens" | "nfts") => void;

    // Header (for back-only mode)
    title?: string;
  };

  let {
    mode = "default",
    token,
    isBalanceVisible = true,
    onToggleBalance,
    onSend,
    onReceive,
    onSwap,
    onBack,
    activeTab = "tokens",
    onTabChange,
    title = "",
  }: Props = $props();

  let failedImageLoad = $state(false);

  function toggleBalanceVisibility() {
    if (onToggleBalance) {
      onToggleBalance();
    }
  }

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

  let tokenLogo = $derived.by(() =>
    token ? getTokenLogo(token.address) : null,
  );

  function handleSend() {
    onSend?.();
  }

  function handleReceive() {
    onReceive?.();
  }

  function handleSwap() {
    onSwap?.();
  }

  function handleBack() {
    onBack?.();
  }

  function handleTokensTab() {
    onTabChange?.("tokens");
  }

  function handleNFTsTab() {
    toast.info(locale.t("wallet.nftMessage"));
    onTabChange?.("nfts");
  }

  function handleImageError() {
    failedImageLoad = true;
  }
</script>

<div class="bg-white">
  {#if mode === "back-only"}
    <!-- Back button with title -->
    <div class="pb-4">
      <div class="flex items-center">
        <button
          onclick={handleBack}
          class="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 class="flex-1 text-center text-xl font-bold pr-10">{title}</h1>
      </div>
    </div>
  {:else if mode === "token" && token}
    <!-- Token Details View -->
    <div class="pb-4">
      <div class="flex items-center mb-2">
        <button
          onclick={handleBack}
          class="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to wallet"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div class="text-center mb-4">
        <!-- Token Logo -->
        <div class="flex justify-center mb-2.5">
          {#if tokenLogo && !failedImageLoad}
            <div class="w-[30px] h-[30px] rounded-full overflow-hidden">
              <img
                alt={token.symbol}
                class="w-full h-full object-cover"
                src={tokenLogo}
                onerror={handleImageError}
              />
            </div>
          {:else}
            <div
              class="w-16 h-16 flex items-center justify-center bg-gray-200 rounded-full text-2xl font-semibold"
            >
              {token.symbol[0]?.toUpperCase() || "?"}
            </div>
          {/if}
        </div>

        <!-- Token Balance -->
        <div class="mx-auto w-fit gap-3 relative">
          <div class="text-[32px]/[100%] font-bold text-black">
            {#if isBalanceVisible}
              {parseBalanceUnits(token.balance, token.decimals).toFixed(5)}
              {token.symbol}
            {:else}
              ****
            {/if}
          </div>
          <button
            onclick={toggleBalanceVisibility}
            class="text-gray-500 hover:text-gray-700 transition-colors active:scale-95 absolute top-1/2 -translate-y-1/2 right-[-36px]"
            aria-label="Toggle balance visibility"
          >
            {#if isBalanceVisible}
              <Eye size={24} />
            {:else}
              <EyeOff size={24} />
            {/if}
          </button>
        </div>

        <!-- USD Value -->
        <div class="text-gray-500 text-xs mt-1 font-semibold">
          {#if isBalanceVisible}
            ${balanceToUSDValue(
              token.balance,
              token.decimals,
              token.priceUSD,
            ).toFixed(2)}
          {:else}
            ****
          {/if}
        </div>
      </div>

      <div class="flex justify-center gap-6 max-w-md mx-auto">
        <button
          onclick={handleSend}
          class="flex flex-col items-center gap-2 transition-transform active:scale-95"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowUp size={20} />
          </div>
          <span class="text-xs text-gray-600 font-medium"
            >{locale.t("wallet.navBar.sendBtn")}</span
          >
        </button>

        <button
          onclick={handleReceive}
          class="flex flex-col items-center gap-2 transition-transform active:scale-95"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowDown size={20} />
          </div>
          <span class="text-xs text-gray-600 font-medium"
            >{locale.t("wallet.navBar.receiveBtn")}</span
          >
        </button>

        <button
          onclick={handleSwap}
          class="flex flex-col items-center gap-2 transition-transform active:scale-95"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowUpDown size={20} />
          </div>
          <span class="text-xs text-gray-600 font-medium"
            >{locale.t("wallet.navBar.swapBtn")}</span
          >
        </button>
      </div>
    </div>
  {:else}
    <!-- Default Wallet View -->
    <div class="pb-6">
      <div class="text-center mb-8">
        <div class="mx-auto w-fit gap-3 relative">
          <div class="text-[32px]/[100%] font-bold text-black">
            {#if isBalanceVisible}
              ${totalBalance.toFixed(2)}
            {:else}
              ****
            {/if}
          </div>
          <button
            onclick={toggleBalanceVisibility}
            class="text-gray-500 hover:text-gray-700 transition-colors active:scale-95 absolute top-1/2 -translate-y-1/2 right-[-36px]"
            aria-label="Toggle balance visibility"
          >
            {#if isBalanceVisible}
              <Eye size={24} />
            {:else}
              <EyeOff size={24} />
            {/if}
          </button>
        </div>
      </div>

      <div class="flex justify-center gap-6 max-w-md mx-auto">
        <button
          onclick={handleSend}
          class="flex flex-col items-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowUp size={20} />
          </div>
          <span class="text-xs text-gray-600 font-medium"
            >{locale.t("wallet.navBar.sendBtn")}</span
          >
        </button>

        <button
          onclick={handleReceive}
          class="flex flex-col items-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowDown size={20} />
          </div>
          <span class="text-xs text-gray-600 font-medium"
            >{locale.t("wallet.navBar.receiveBtn")}</span
          >
        </button>

        <button
          onclick={handleSwap}
          class="flex flex-col items-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowUpDown size={20} />
          </div>
          <span class="text-xs text-gray-600 font-medium"
            >{locale.t("wallet.navBar.swapBtn")}</span
          >
        </button>
      </div>

      <div class="flex mt-8">
        <button
          onclick={handleTokensTab}
          class="flex-1 pb-3 text-center font-semibold transition-colors relative"
          class:text-green={activeTab === "tokens"}
          class:text-gray-500={activeTab !== "tokens"}
        >
          {locale.t("wallet.navBar.tokensTabBtn")}
          {#if activeTab === "tokens"}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-green"></div>
          {/if}
        </button>
        <button
          onclick={handleNFTsTab}
          class="flex-1 pb-3 text-center font-semibold transition-colors relative"
          class:text-green={activeTab === "nfts"}
          class:text-gray-500={activeTab !== "nfts"}
        >
          {locale.t("wallet.navBar.nftsTabBtn")}
          {#if activeTab === "nfts"}
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-green"></div>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
