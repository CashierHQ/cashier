<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { Info, ChevronRight } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";

  type Props = {
    totalFeesUsd: number;
    isClickable?: boolean;
    onInfoClick?: () => void;
  };

  let {
    totalFeesUsd,
    isClickable = false,
    onInfoClick,
  }: Props = $props();
</script>

<div class="input-label-field-container">
  <div class="flex items-center w-full justify-between mb-2">
    <Label class="font-medium text-sm">{locale.t("links.linkForm.preview.feesBreakdown")}</Label>
    <button
        class="flex items-center gap-1 cursor-pointer"
        type="button"
        >
        <Info size={18} color="#36A18B" />
    </button>
  </div>
  {#if isClickable && onInfoClick}
    <button
      type="button"
      class="border-[1px] rounded-lg border-lightgreen px-4 py-3 w-full text-left cursor-pointer hover:bg-gray-50 transition-colors"
      onclick={onInfoClick}
    >
      <div class="flex justify-between items-center">
        <p class="text-[14px] font-medium">{locale.t("links.linkForm.preview.totalFees")}</p>
        <div class="flex items-center gap-2">
          <p class="text-[14px] font-normal">{formatUsdAmount(totalFeesUsd)}</p>
          <ChevronRight size={18} />
        </div>
      </div>
    </button>
  {:else}
    <div class="border-[1px] rounded-lg border-lightgreen px-4 py-3">
      <div class="flex justify-between items-center">
        <p class="text-[14px] font-medium">{locale.t("links.linkForm.preview.totalFees")}</p>
        <div class="flex items-center gap-2">
          <p class="text-[14px] font-normal">{formatUsdAmount(totalFeesUsd)}</p>
        </div>
      </div>
    </div>
  {/if}
</div>
