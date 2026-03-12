<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeList from "$modules/bitcoin/components/bridgeList.svelte";
  import { bridgeStore } from "$modules/bitcoin/state/bridgeStore.svelte";
  import {
    BridgeType,
    type BridgeTransactionWithUsdValue,
  } from "$modules/bitcoin/types/bridge_transaction";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type { BridgeSource } from "$modules/transactionCart/types/transactionSource";

  const exportBridgeTxs = $derived.by(
    (): BridgeTransactionWithUsdValue[] =>
      bridgeStore.bridgeTxs?.filter(
        (bridge) => bridge.bridge_type === BridgeType.Export,
      ) ?? [],
  );

  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);
  let minConfirmations = $derived.by(() => bridgeStore.minConfirmations);

  function handleSelectBridge(bridgeId: string) {
    const bridge = bridgeStore.bridgeTxs?.find((b) => b.bridge_id === bridgeId);

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
    bridgeStore.loadMore();
  }
</script>

<div class="space-y-4">
  <Label class="text-base font-semibold">
    {locale.t("bitcoin.send.history")}
  </Label>

  <BridgeList
    bridgeTxs={exportBridgeTxs}
    hasMore={bridgeStore.hasMore}
    emptyText={locale.t("wallet.send.noBtcExportTxs")}
    onSelectBridge={handleSelectBridge}
    onLoadMore={handleLoadMore}
  />
</div>

{#if showBridgeTxCart && bridgeSource}
  <BridgeTxCart
    bind:isOpen={showBridgeTxCart}
    source={bridgeSource}
    {minConfirmations}
    onCloseDrawer={handleCloseBridgeTxCart}
  />
{/if}
