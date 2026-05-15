<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeList from "$modules/bitcoin/components/bridgeList.svelte";
  import { btcBridgeStore } from "$modules/bitcoin/state/btcBridgeStore.svelte";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type { BridgeSource } from "$modules/transactionCart/types/transactionSource";
  import {
    ArrowLeftRight,
    ChevronDown,
    ChevronUp,
    Coins,
    Copy,
    Hourglass,
    LayoutList,
    RefreshCw,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  type Props = {
    tokenSymbol?: string | null;
  };

  let { tokenSymbol = null }: Props = $props();

  const depositAddress = $derived.by(() => btcBridgeStore.btcAddress);
  const shortenDepositAddress = $derived.by(() =>
    transformShortAddress(depositAddress || ""),
  );
  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);
  let minConfirmations = $derived.by(() => btcBridgeStore.minConfirmations);
  const importBridgeTxs = $derived.by(
    () => btcBridgeStore.importBridgeTxs ?? [],
  );
  const hasMoreImports = $derived.by(() => btcBridgeStore.hasMoreImports);
  const isRefreshing = $derived.by(() => btcBridgeStore.isRefreshing);

  let historyExpanded = $state(true);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(locale.t("wallet.receive.copySuccess"));
  }

  function handleSelectBridge(bridgeId: string) {
    const bridge = importBridgeTxs.find((b) => b.bridge_id === bridgeId);

    if (!bridge) return;

    showBridgeTxCart = true;
    bridgeSource = {
      bridge,
    };
  }

  function handleCloseBridgeTxCart() {
    showBridgeTxCart = false;
    bridgeSource = null;
  }

  function handleLoadMore() {
    btcBridgeStore.loadMoreImports();
  }

  async function handleRefresh() {
    const result = await btcBridgeStore.manualRefreshBalance();

    if (result.isErr()) {
      toast.error(locale.t("bitcoin.receive.refreshError"));
    } else if (result.unwrap() === 0) {
      toast.info(locale.t("bitcoin.receive.noIncomingBalance"));
    } else {
      toast.success(locale.t("bitcoin.receive.refreshSuccess"));
    }
  }
</script>

<div class="px-8 btc-gradient rounded-2xl py-4 mt-6">
  <div class="mb-6 flex justify-center">
    <Label class="text-small font-medium">
      {locale.t("bitcoin.receive.title")}
    </Label>
  </div>

  <div class="space-y-2">
    <Label class="text-small font-medium">
      {locale
        .t("wallet.receive.btcAddress")
        .replace("{{token}}", tokenSymbol ?? "BTC")}
    </Label>

    <div class="relative">
      <input
        type="text"
        value={shortenDepositAddress}
        readonly
        class="w-full p-3 pr-12 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none text-sm font-mono break-all"
      />
      <button
        onclick={() => handleCopy(depositAddress ?? "")}
        class="absolute right-3 top-1/2 -translate-y-1/2 text-[#36A18B] hover:text-[#2d8a75] transition-colors"
        title={locale.t("wallet.receive.copyTooltip")}
      >
        <Copy size={20} class="text-[#36A18B]" />
      </button>
    </div>
    <div
      class="text-xs text-grey mt-1 mb-4 max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
    >
      {locale.t("wallet.send.addressBitcoinExample")}
    </div>
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-1.5">
        <LayoutList class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
        <div
          class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {locale.t("bitcoin.receive.btcAddress.warning1")}
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <ArrowLeftRight class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
        <div
          class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {locale.t("bitcoin.receive.btcAddress.warning2")}
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <Coins class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
        <div
          class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {locale.t("bitcoin.receive.btcAddress.warning3")}
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <Hourglass class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
        <div
          class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {locale.t("bitcoin.receive.btcAddress.warning4")}
        </div>
      </div>
    </div>
  </div>
  <div class="mt-6 flex items-start justify-between gap-2">
    <Label class="text-base font-semibold">
      {locale.t("bitcoin.receive.history")}
    </Label>
    <div class="flex flex-col items-center gap-2.5 -mb-4 pt-1">
      <button
        type="button"
        onclick={() => (historyExpanded = !historyExpanded)}
        class="text-[#36A18B] transition-colors hover:text-[#2d8a75]"
        aria-expanded={historyExpanded}
        title={historyExpanded
          ? locale.t("bitcoin.receive.collapseHistory")
          : locale.t("bitcoin.receive.expandHistory")}
      >
        {#if historyExpanded}
          <ChevronUp size={18} />
        {:else}
          <ChevronDown size={18} />
        {/if}
      </button>
      {#if historyExpanded}
        <button
          type="button"
          onclick={handleRefresh}
          disabled={isRefreshing}
          class="text-[#36A18B] transition-colors hover:text-[#2d8a75] disabled:opacity-50 bg-white rounded-sm p-1 border"
          title={locale.t("bitcoin.receive.refreshTooltip")}
        >
          <RefreshCw size={12} class={isRefreshing ? "animate-spin" : ""} />
        </button>
      {/if}
    </div>
  </div>

  {#if historyExpanded}
    <BridgeList
      bridgeTxs={importBridgeTxs}
      hasMore={hasMoreImports}
      emptyText={locale.t("wallet.receive.noBtcImportTxs")}
      onSelectBridge={handleSelectBridge}
      onLoadMore={handleLoadMore}
    />
  {/if}
</div>

{#if showBridgeTxCart && bridgeSource}
  <BridgeTxCart
    bind:isOpen={showBridgeTxCart}
    source={bridgeSource}
    {minConfirmations}
    onCloseDrawer={handleCloseBridgeTxCart}
  />
{/if}
