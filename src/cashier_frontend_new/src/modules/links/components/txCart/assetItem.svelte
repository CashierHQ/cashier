<script lang="ts">
  import loadingGif from "$lib/assets/loading.gif";
  import { Check, X } from "lucide-svelte";
  import { AssetProcessState, type AssetItem } from "./type";

  let {
    asset,
  }: {
    asset: AssetItem;
  } = $props();
</script>

<div class="p-3 border rounded bg-background flex items-center justify-between">
  <div class="flex items-center gap-3">
    {#if asset.state == AssetProcessState.PROCESSING}
      <img src={loadingGif} alt="loading" class="w-6 h-6" />
    {/if}
    {#if asset.state == AssetProcessState.SUCCEED}
      <div class="text-green-600">
        <Check class="w-4 h-4" />
      </div>
    {:else if asset.state == AssetProcessState.FAILED}
      <div class="text-red-600">
        <X class="w-4 h-4" />
      </div>
    {/if}

    <div
      class="w-10 h-10 rounded-full bg-white flex items-center justify-center border"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" fill="url(#g)" />
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stop-color="#FF6B6B" />
            <stop offset="1" stop-color="#845EC2" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <div class="text-sm">
      <div class="font-medium">
        {asset.symbol}
      </div>
      <div class="text-xs text-muted-foreground">
        {asset.label}
      </div>
    </div>
  </div>

  <div class="text-right">
    <div class="font-medium text-lg">{asset.amount}</div>
    {#if asset.usdValueStr}
      <div class="text-xs text-muted-foreground">{asset.usdValueStr}</div>
    {/if}
  </div>
</div>
