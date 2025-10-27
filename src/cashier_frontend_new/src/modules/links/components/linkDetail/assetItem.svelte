<script lang="ts">
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import type { AssetInfo } from "../../types/link/asset";

  interface Props {
    assetInfo: AssetInfo;
  }

  let { assetInfo }: Props = $props();

  const address = assetInfo.asset.address?.toString() || "";
  const tokenMetadata = tokenMetadataQuery(address);

  const formattedAmount = $derived(
    tokenMetadata.data
      ? parseBalanceUnits(
          assetInfo.amount_per_link_use_action,
          tokenMetadata.data.decimals,
        ).toFixed(5)
      : String(assetInfo.amount_per_link_use_action),
  );

  const tokenSymbol = $derived(tokenMetadata.data?.symbol || address.slice(-8));
</script>

<div class="inline-flex items-center text-sm gap-2">
  {#if tokenMetadata.isLoading}
    <div class="text-sm">Loading...</div>
  {:else if tokenMetadata.error}
    <div class="text-sm">
      {String(assetInfo.amount_per_link_use_action)}
      {address.slice(-8)}
    </div>
  {:else}
    <div class="text-sm">
      {formattedAmount}
      {tokenSymbol}
    </div>
  {/if}
</div>
