<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeItem from '$modules/bitcoin/components/bridgeItem.svelte';
  import { bridgeStore } from "$modules/bitcoin/state/bridgeStore.svelte";
  import { groupBridgeTransactionsByDate } from '$modules/bitcoin/utils';
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import BridgeTxCart from '$modules/transactionCart/components/BridgeTxCart.svelte';
  import type { BridgeSource } from '$modules/transactionCart/types/transactionSource';
  import { Copy, Info } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  const btcAddress = $derived.by(() => bridgeStore.btcAddress);
  const shortenBtcAddress = $derived.by(() =>
    transformShortAddress(btcAddress || ""),
  );
  let showBridgeTxCart = $state(false);
  let bridgeSource = $state<BridgeSource | null>(null);

  let bridgeTxsByDate = $derived.by(() => {
    if (bridgeStore.bridgeTxs) {
      return groupBridgeTransactionsByDate(bridgeStore.bridgeTxs);
    }
    return {};
  });

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(locale.t("wallet.receive.copySuccess"));
  }

  function handleSelectBridge(bridgeId: string) {
    const bridge = bridgeStore.bridgeTxs?.find(
      (b) => b.bridge_id === bridgeId,
    );

    if (!bridge) return;

    showBridgeTxCart = true;
    bridgeSource = {
      bridge
    };
  }

  function handleCloseBridgeTxCart() {
    showBridgeTxCart = false;
    bridgeSource = null;
  }
</script>
<div>
  <div class="space-y-4">
    <Label class="text-base font-semibold">
        {locale
          .t("wallet.receive.btcAddress")
          .replace("{{token}}", "BTC")}
    </Label>

    <div class="relative">
      <input
        type="text"
        value={shortenBtcAddress}
        readonly
        class="w-full p-3 pr-12 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none text-sm font-mono break-all"
      />
      <button
        onclick={() => handleCopy(btcAddress?? "")}
        class="absolute right-3 top-1/2 -translate-y-1/2 text-[#36A18B] hover:text-[#2d8a75] transition-colors"
        title={locale.t("wallet.receive.copyTooltip")}
      >
        <Copy size={20} class="text-[#36A18B]" />
      </button>
    </div>
    <div class="flex items-start gap-1.5">
      <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
      <div class="text-sm text-green">
        {locale.t("bitcoin.receive.btcAddress.warning1")}
      </div>
    </div>
    <div class="flex items-start gap-1.5">
      <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
      <div class="text-sm text-green">
        {locale.t("bitcoin.receive.btcAddress.warning2")}
      </div>
    </div>
    <div class="flex items-start gap-1.5">
      <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
      <div class="text-sm text-green">
        {locale.t("bitcoin.receive.btcAddress.warning3")}
      </div>
    </div>
    <div class="flex items-start gap-1.5">
      <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
      <div class="text-sm text-green">
        {locale.t("bitcoin.receive.btcAddress.warning4")}
      </div>
    </div>
  </div>
  <div class="space-y-4">
    {#if Object.keys(bridgeTxsByDate).length > 0}
      {#each Object.keys(bridgeTxsByDate) as createdDate}
        <Label class="text-base font-semibold">
          {createdDate}
        </Label>
        <div class="text-sm text-gray-600">
          {#each bridgeTxsByDate[createdDate] as bridge}
          <BridgeItem
            {bridge}
            onSelect={() => handleSelectBridge(bridge.bridge_id)} />
          {/each}
        </div>
      {/each}
    {:else}
      <p>{locale.t("wallet.receive.noBtcImportTxs")}</p>
    {/if}
  </div>
</div>

{#if showBridgeTxCart && bridgeSource}
  <BridgeTxCart
    bind:isOpen={showBridgeTxCart}
    source={bridgeSource}
    minConfirmations={bridgeStore.minterInfo?.min_confirmations ?? 6}
    onCloseDrawer={handleCloseBridgeTxCart}/>
{/if}