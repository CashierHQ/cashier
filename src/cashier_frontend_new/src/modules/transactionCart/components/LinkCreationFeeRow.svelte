<script lang="ts">
  import { X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import type { AssetAndFee } from "$modules/shared/types/feeService";

  type Props = {
    item: AssetAndFee;
    isProcessing?: boolean;
    hasError?: boolean;
  };

  let { item, isProcessing = false, hasError = false }: Props = $props();
</script>

{#if item.fee}
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-1.5">
      {#if hasError}
        <X size={16} class="text-red-600" stroke-width={2.5} />
      {:else if isProcessing}
        <div
          class="w-4 h-4 border-2 border-green border-t-transparent rounded-full animate-spin"
        ></div>
      {/if}
      <img
        src={getTokenLogo(item.asset.address)}
        alt={item.asset.symbol}
        class="w-5 h-5 rounded-full overflow-hidden"
      />
      <p class="text-[14px] font-medium">
        {item.asset.symbol}
      </p>
      <p class="text-[12px] font-normal text-[#b6b6b6] pt-0.5">
        {locale.t("links.linkForm.preview.linkCreationFee")}
      </p>
    </div>
    <div class="flex flex-col items-end">
      <p class="text-[14px] font-normal">
        {item.fee.amountFormattedStr}
      </p>
      {#if item.fee.usdValueStr}
        <p class="text-[10px] font-normal text-[#b6b6b6]">
          ~${formatUsdAmount(parseFloat(item.fee.usdValueStr))}
        </p>
      {/if}
    </div>
  </div>
{/if}
