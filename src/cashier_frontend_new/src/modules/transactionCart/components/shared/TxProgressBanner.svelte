<script lang="ts">
  import { locale } from "$lib/i18n";
  import { TxProgressPhase } from "$modules/transactionCart/types/txCart";
  import { Check } from "lucide-svelte";

  type Props = {
    phase: TxProgressPhase;
  };

  let { phase }: Props = $props();
</script>

{#if phase === TxProgressPhase.FE_PHASE}
  <div class="flex items-center gap-3 rounded-lg bg-[#F0FAF6] px-4 py-3">
    <div
      class="w-4 h-4 flex-shrink-0 border-2 border-green border-t-transparent rounded-full animate-spin"
    ></div>
    <div>
      <p class="text-[14px] font-semibold text-green leading-tight">
        {locale.t("links.linkForm.drawers.txCart.action.phase1Label")}
      </p>
      <p class="text-[12px] text-gray-700 leading-tight mt-0.5">
        {locale.t("links.linkForm.drawers.txCart.action.phase1Description")}
      </p>
    </div>
  </div>
{:else if phase === TxProgressPhase.BE_PHASE}
  <div class="flex items-center gap-3 rounded-lg bg-[#EFF6FF] px-4 py-3">
    <div
      class="w-4 h-4 flex-shrink-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
    ></div>
    <div>
      <p class="text-[14px] font-semibold text-blue-600 leading-tight">
        {locale.t("links.linkForm.drawers.txCart.action.phase2Label")}
      </p>
      <p class="text-[12px] text-gray-700 leading-tight mt-0.5">
        {locale.t("links.linkForm.drawers.txCart.action.phase2Description")}
      </p>
    </div>
  </div>
{:else if phase === TxProgressPhase.COMPLETED}
  <div class="flex items-center gap-3 rounded-lg bg-[#F0FAF6] px-4 py-3">
    <div
      class="w-5 h-5 flex-shrink-0 rounded-full bg-green flex items-center justify-center"
    >
      <Check size={12} class="text-white" stroke-width={3} />
    </div>
    <div>
      <p class="text-[14px] font-semibold text-green leading-tight">
        {locale.t("links.linkForm.drawers.txCart.action.phase3Label")}
      </p>
      <p class="text-[12px] text-gray-700 leading-tight mt-0.5">
        {locale.t("links.linkForm.drawers.txCart.action.phase3Description")}
      </p>
    </div>
  </div>
{/if}
