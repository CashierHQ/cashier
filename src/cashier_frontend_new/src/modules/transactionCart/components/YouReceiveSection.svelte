<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import type { AssetAndFee } from "$modules/shared/types/feeService";

  type Props = {
    assets: AssetAndFee[];
    failedImageLoads: Set<string>;
    onImageError: (address: string) => void;
    isProcessing?: boolean;
    hasError?: boolean;
  };

  let {
    assets,
    failedImageLoads,
    onImageError,
    isProcessing = false,
    hasError = false,
  }: Props = $props();
</script>

<div class="input-label-field-container">
  <div class="flex items-center w-full justify-between mb-2">
    <Label class="font-medium text-sm">
      {locale.t("links.linkForm.preview.youReceive")}
    </Label>
  </div>
  <div
    class="border-[1px] rounded-lg border-lightgreen px-4 py-3 flex flex-col gap-3"
  >
    {#each assets as { asset } (asset.address)}
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-1.5">
          {#if hasError}
            <X size={16} class="text-red-600" stroke-width={2.5} />
          {:else if isProcessing}
            <div
              class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin"
            ></div>
          {/if}
          {#if !failedImageLoads.has(asset.address)}
            <img
              src={getTokenLogo(asset.address)}
              alt={asset.symbol}
              class="w-5 h-5 rounded-full overflow-hidden"
              onerror={() => onImageError(asset.address)}
            />
          {:else}
            <div
              class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden"
            >
              {asset.symbol[0]?.toUpperCase() || "?"}
            </div>
          {/if}
          <p class="text-[14px] font-medium">{asset.symbol}</p>
        </div>
        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1">
            <p class="text-[14px] font-normal">
              {asset.amountFormattedStr}
            </p>
          </div>
          {#if asset.usdValueStr}
            <p class="text-[10px] medium-font text-[#b6b6b6]">
              ~${asset.usdValueStr}
            </p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
