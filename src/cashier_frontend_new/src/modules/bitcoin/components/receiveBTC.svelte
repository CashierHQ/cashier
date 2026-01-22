<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeItem from '$modules/bitcoin/components/bridgeItem.svelte';
  import { bridgeStore } from "$modules/bitcoin/state/bridgeStore.svelte";
  import { groupBridgeTransactionsByDate } from '$modules/bitcoin/utils';
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { Copy } from "lucide-svelte";
  import { toast } from "svelte-sonner";

  const btcAddress = $derived.by(() => bridgeStore.btcAddress);
  const shortenBtcAddress = $derived.by(() =>
    transformShortAddress(btcAddress || ""),
  );

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
            onSelect={(txid: string) => {
              navigator.clipboard.writeText(txid);
              toast.success(locale.t("wallet.receive.copySuccess"));
            }} />
          {/each}
        </div>
      {/each}
    {:else}
      <p>{locale.t("wallet.receive.btcNoMempoolTxs")}</p>
    {/if}
  </div>
</div>