<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeList from "$modules/bitcoin/components/bridgeList.svelte";
  import { runeBridgeStore } from "$modules/bitcoin/state/runeBridgeStore.svelte";
  import {
    BridgeType,
    type BridgeTransactionWithUsdValue,
  } from "$modules/bitcoin/types/bridge_transaction";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type { BridgeSource } from "$modules/transactionCart/types/transactionSource";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";

  type Props = {
    token: TokenWithPriceAndBalance | null;
    minConfirmations: number;
  };

  let { token, minConfirmations }: Props = $props();

  const exportBridgeTxs = $derived.by(
    () => runeBridgeStore.exportBridgeTxs ?? [],
  );
  const hasMoreExportBridgeTxs = $derived.by(
    () => runeBridgeStore.hasMoreExports,
  );

  $effect(() => {
    const runeId =
      token?.isRune && token.runeInfo ? token.runeInfo.runeId : null;
    runeBridgeStore.setRuneId(runeId);

    return () => {
      runeBridgeStore.setRuneId(null);
    };
  });

  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);

  function handleSelectBridge(bridgeId: string) {
    const bridge = exportBridgeTxs.find((b) => b.bridge_id === bridgeId);
    if (!bridge || bridge.bridge_type !== BridgeType.Export) {
      return;
    }

    showBridgeTxCart = true;
    bridgeSource = { bridge };
  }

  function handleCloseBridgeTxCart() {
    showBridgeTxCart = false;
    bridgeSource = null;
  }

  function handleLoadMore() {
    runeBridgeStore.loadMoreExports();
  }
</script>

<div class="space-y-4">
  <Label class="text-base font-semibold">
    {locale.t("bitcoin.send.history")}
  </Label>

  <BridgeList
    bridgeTxs={exportBridgeTxs as BridgeTransactionWithUsdValue[]}
    hasMore={hasMoreExportBridgeTxs}
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
