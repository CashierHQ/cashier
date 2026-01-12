<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import { formatFeeAmount } from "$modules/shared/utils/formatNumber";

  const {
    totalFeesUsd,
  }: {
    totalFeesUsd: number;
  } = $props();
</script>

<!-- Block 4: Fees Breakdown -->
<div class="input-label-field-container">
  <div class="flex items-center w-full justify-between mb-2">
    <Label class="font-medium text-sm"
      >{locale.t("links.linkForm.preview.feesBreakdown")}</Label
    >
  </div>
  <div class="border-[1px] rounded-lg border-lightgreen px-4 py-3">
    <div class="flex justify-between items-center">
      <p class="text-[14px] font-medium">
        {locale.t("links.linkForm.preview.totalFees")}
      </p>
      <div class="flex items-center gap-2">
        <p class="text-[14px] font-normal">
          ~${formatFeeAmount(totalFeesUsd)}
        </p>
      </div>
    </div>
  </div>
</div>
