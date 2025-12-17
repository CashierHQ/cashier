<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
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

  type Props = {
    activeTab?: "tokens" | "nfts";
    header?: string;
    isBalanceVisible?: boolean;
    onToggleBalance?: () => void;
  };

  let {
    activeTab = $bindable("tokens"),
    header,
    isBalanceVisible = true,
    onToggleBalance,
  }: Props = $props();

  let currentPath = $derived.by(() => page.url.pathname);
  let tokenParam = $derived(page.params.token);
  let failedImageLoad = $state(false);

  const toggleBalanceVisibility = () => {
    if (onToggleBalance) {
      onToggleBalance();
    }
  };

  const calculateTotalBalance = () => {
    if (!walletStore.query.data) return 0;

    return walletStore.query.data
      .filter((token) => token.enabled)
      .reduce((total, token) => {
        return (
          total +
          balanceToUSDValue(token.balance, token.decimals, token.priceUSD)
        );
      }, 0);
  };

  let totalBalance = $derived(calculateTotalBalance());

  // Get token details if we're on a token page
  let currentToken = $derived(
    tokenParam && walletStore.query.data
      ? walletStore.query.data.find((t) => t.address === tokenParam)
      : null,
  );

  let tokenLogo = $derived(
    currentToken ? getTokenLogo(currentToken.address) : null,
  );

  const handleSend = () =>
    goto(
      resolve(
        isTokenPage && currentToken
          ? `/wallet/send?token=${currentToken.address}`
          : "/wallet/send",
      ),
    );
  const handleReceive = () =>
    goto(
      resolve(
        isTokenPage && currentToken
          ? `/wallet/send?token=${currentToken.address}`
          : "/wallet/receive",
      ),
    );
  const handleSwap = () => console.log("Swap clicked");

  const handleTokensTab = () => {
    activeTab = "tokens";
  };

  const handleNFTsTab = () => {
    toast.info(locale.t("wallet.nftMessage"));
  };

  const handleBack = () => {
    if (currentPath === "/wallet/import") {
      goto(resolve("/wallet/manage"));
      return;
    }

    goto(resolve("/wallet"));
  };

  const getPageTitle = (path: string): string => {
    if (header) return header;

    if (path === "/wallet/send") return "Send";
    if (path === "/wallet/receive") return "Receive";
    if (path === "/wallet/swap") return "Swap";
    if (path === "/wallet/manage") return "Manage tokens";
    if (path === "/wallet/import") return "Import manually";
    return "";
  };

  const showBackButton = $derived(
    currentPath !== "/wallet" &&
      (currentPath === "/wallet/send" ||
        currentPath === "/wallet/receive" ||
        currentPath === "/wallet/swap" ||
        currentPath === "/wallet/manage" ||
        currentPath === "/wallet/import"),
  );

  // Check if we're on a token details page
  const isTokenPage = $derived(
    currentPath.startsWith("/wallet/") &&
      tokenParam &&
      !["send", "receive", "swap", "manage", "import"].includes(tokenParam),
  );

  const pageTitle = $derived(getPageTitle(currentPath));

  const handleImageError = () => {
    failedImageLoad = true;
  };
</script>

<div class="bg-white">
  {#if showBackButton}
    <div class="px-6 pt-6 pb-4">
      <div class="flex items-center">
        <button
          onclick={handleBack}
          class="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to wallet"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 class="flex-1 text-center text-xl font-bold pr-10">{pageTitle}</h1>
      </div>
    </div>
  {:else if isTokenPage && currentToken}
    <!-- Token Details View -->
    <div class="px-6 pt-6 pb-4">
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
                alt={currentToken.symbol}
                class="w-full h-full object-cover"
                src={tokenLogo}
                onerror={handleImageError}
              />
            </div>
          {:else}
            <div
              class="w-16 h-16 flex items-center justify-center bg-gray-200 rounded-full text-2xl font-semibold"
            >
              {currentToken.symbol[0]?.toUpperCase() || "?"}
            </div>
          {/if}
        </div>

        <!-- Token Balance -->
        <div class="mx-auto w-fit gap-3 relative">
          <div class="text-[32px]/[100%] font-bold text-black">
            {#if isBalanceVisible}
              {parseBalanceUnits(
                currentToken.balance,
                currentToken.decimals,
              ).toFixed(5)}
              {currentToken.symbol}
            {:else}
              ****
            {/if}
          </div>
          {#if currentPath === "/wallet"}
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
          {/if}
        </div>

        <!-- USD Value -->
        <div class="text-gray-500 text-xs mt-1 font-semibold">
          {#if isBalanceVisible}
            ${balanceToUSDValue(
              currentToken.balance,
              currentToken.decimals,
              currentToken.priceUSD,
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
          <span class="text-sm text-gray-600 font-medium"
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
          <span class="text-sm text-gray-600 font-medium"
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
          <span class="text-sm text-gray-600 font-medium"
            >{locale.t("wallet.navBar.swapBtn")}</span
          >
        </button>
      </div>
    </div>
  {:else}
    <!-- Default Wallet View -->
    <div class="p-6">
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
          class="flex flex-col items-center gap-2 transition-transform active:scale-95"
        >
          <div
            class="w-9 h-9 rounded-full bg-lightgreen transition-colors flex items-center justify-center"
          >
            <ArrowUp size={20} />
          </div>
          <span class="text-sm text-gray-600 font-medium"
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
          <span class="text-sm text-gray-600 font-medium"
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
          <span class="text-sm text-gray-600 font-medium"
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
