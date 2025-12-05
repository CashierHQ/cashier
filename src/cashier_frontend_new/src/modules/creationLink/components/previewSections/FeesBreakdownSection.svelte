<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { Info, ChevronRight } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";

  type Props = {
    totalFeesUsd: number;
    isClickable?: boolean;
    onInfoClick?: () => void; // Handler for info icon button click
    onBreakdownClick?: () => void; // Handler for breakdown button click (with ChevronRight)
  };

  let {
    totalFeesUsd,
    isClickable = false,
    onInfoClick,
    onBreakdownClick,
  }: Props = $props();
</script>

<div class="input-label-field-container">
  <div class="flex items-center w-full justify-between mb-2">
    <Label class="font-medium text-sm"
      >{locale.t("links.linkForm.preview.feesBreakdown")}</Label
    >
    {#if isClickable && onInfoClick}
      <button
        class="flex items-center gap-1 cursor-pointer"
        type="button"
        onclick={onInfoClick}
      >
        <Info size={18} color="#36A18B" />
      </button>
    {/if}
  </div>
  {#if isClickable && onBreakdownClick}
    <button
      type="button"
      class="border-[1px] rounded-lg border-lightgreen px-4 py-3 w-full text-left cursor-pointer hover:bg-gray-50 transition-colors"
      onclick={onBreakdownClick}
    >
      <div class="flex justify-between items-center">
        <p class="text-[14px] font-medium">
          {locale.t("links.linkForm.preview.totalFees")}
        </p>
        <div class="flex items-center gap-2">
          <p class="text-[14px] font-normal">{formatUsdAmount(totalFeesUsd)}</p>
          <ChevronRight size={18} />
        </div>
      </div>
    </button>
  {:else}
    <div class="border-[1px] rounded-lg border-lightgreen px-4 py-3">
      <div class="flex justify-between items-center">
        <p class="text-[14px] font-medium">
          {locale.t("links.linkForm.preview.totalFees")}
        </p>
        <div class="flex items-center gap-2">
          <p class="text-[14px] font-normal">{formatUsdAmount(totalFeesUsd)}</p>
        </div>
      </div>
    </div>
  {/if}
</div>
