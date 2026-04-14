<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeList from "$modules/bitcoin/components/bridgeList.svelte";
  import { bridgeStore } from "$modules/bitcoin/state/bridgeStore.svelte";
  import { BridgeType } from "$modules/bitcoin/types/bridge_transaction";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type { BridgeSource } from "$modules/transactionCart/types/transactionSource";
  import { ChevronDown, ChevronUp, RefreshCw } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  const exportBridgeTxs = $derived.by(() => bridgeStore.exportBridgeTxs ?? []);

  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);
  let historyExpanded = $state(true);
  let exportHistoryRefreshing = $state(false);
  let minConfirmations = $derived.by(() => bridgeStore.minConfirmations);

  function handleSelectBridge(bridgeId: string) {
    const bridge = bridgeStore.exportBridgeTxs?.find(
      (b) => b.bridge_id === bridgeId,
    );

    if (!bridge || bridge.bridge_type !== BridgeType.Export) return;

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
    bridgeStore.loadMoreExports();
  }

  async function handleRefreshExportHistory() {
    exportHistoryRefreshing = true;
    try {
      await bridgeStore.refreshExportHistoryAsync();
      toast.success(locale.t("bitcoin.send.refreshSuccess"));
    } catch {
      toast.error(locale.t("bitcoin.send.refreshError"));
    } finally {
      exportHistoryRefreshing = false;
    }
  }
</script>

<div class="mt-6 space-y-0">
  <div class="flex items-start justify-between gap-2">
    <Label class="text-base font-semibold">
      {locale.t("bitcoin.send.history")}
    </Label>
    <div class="flex flex-col items-center gap-2.5 -mb-4 pt-1">
      <button
        type="button"
        onclick={() => (historyExpanded = !historyExpanded)}
        class="text-[#36A18B] transition-colors hover:text-[#2d8a75]"
        aria-expanded={historyExpanded}
        title={historyExpanded
          ? locale.t("bitcoin.send.collapseHistory")
          : locale.t("bitcoin.send.expandHistory")}
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
          onclick={handleRefreshExportHistory}
          disabled={exportHistoryRefreshing}
          class="text-[#36A18B] transition-colors hover:text-[#2d8a75] disabled:opacity-50 bg-white rounded-sm p-1 border"
          title={locale.t("bitcoin.send.refreshTooltip")}
        >
          <RefreshCw
            size={12}
            class={exportHistoryRefreshing ? "animate-spin" : ""}
          />
        </button>
      {/if}
    </div>
  </div>
  {#if historyExpanded}
    <BridgeList
      bridgeTxs={exportBridgeTxs}
      hasMore={bridgeStore.hasMoreExports}
      emptyText={locale.t("wallet.send.noBtcExportTxs")}
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
