<script lang="ts">
  import { locale } from "$lib/i18n";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import BridgeItem from "$modules/bitcoin/components/bridgeItem.svelte";
  import { type BridgeTransactionWithUsdValue } from "$modules/bitcoin/types/bridge_transaction";
  import { groupBridgeTransactionsByDate } from "$modules/bitcoin/utils";

  interface Props {
    bridgeTxs: BridgeTransactionWithUsdValue[];
    hasMore: boolean;
    onSelectBridge: (bridgeId: string) => void;
    onLoadMore: () => void;
  }

  let { bridgeTxs, hasMore, onSelectBridge, onLoadMore }: Props = $props();

  let bridgeTxsByDate = $derived.by(() => {
    if (bridgeTxs) {
      return groupBridgeTransactionsByDate(bridgeTxs);
    }
    return {};
  });
</script>

<div class="space-y-4">
  {#if Object.keys(bridgeTxsByDate).length > 0}
    {#each Object.keys(bridgeTxsByDate) as createdDate (createdDate)}
      <Label class="text-base font-semibold">
        {createdDate}
      </Label>
      <div class="text-sm text-gray-600">
        {#each bridgeTxsByDate[createdDate] as bridge (bridge.bridge_id)}
          <BridgeItem
            {bridge}
            onSelect={() => onSelectBridge(bridge.bridge_id)}
          />
        {/each}
      </div>
    {/each}
    {#if hasMore}
      <div class="text-center mt-4">
        <button
          class="text-green hover:text-teal-700 font-medium text-base transition-colors"
          onclick={onLoadMore}
        >
          {locale.t("wallet.loadMore")}
        </button>
      </div>
    {/if}
  {:else}
    <p>{locale.t("wallet.receive.noBtcImportTxs")}</p>
  {/if}
</div>
