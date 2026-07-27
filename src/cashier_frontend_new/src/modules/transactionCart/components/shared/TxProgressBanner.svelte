<script lang="ts">
  import { locale } from "$lib/i18n";
  import { TxProgressPhase } from "$modules/transactionCart/types/txCart";
  import { Check } from "lucide-svelte";

  type Props = {
    phase: TxProgressPhase;
  };

  let { phase }: Props = $props();

  const isExecuting = $derived(phase === TxProgressPhase.FE_PHASE);
  const isConfirming = $derived(phase === TxProgressPhase.BE_PHASE);
  const isCompleted = $derived(phase === TxProgressPhase.COMPLETED);

  const i18nKey = "links.linkForm.drawers.txCart.action";

  const executeLabel = $derived(
    isExecuting
      ? locale.t(`${i18nKey}.stepExecuting`)
      : locale.t(`${i18nKey}.stepExecuted`),
  );
  const confirmLabel = $derived.by(() => {
    if (isExecuting) return locale.t(`${i18nKey}.stepConfirm`);
    if (isConfirming) return locale.t(`${i18nKey}.stepConfirming`);
    return locale.t(`${i18nKey}.stepConfirmed`);
  });

  function stepClass(isCurrent: boolean, isDone: boolean): string {
    if (isDone) return "bg-green border-green text-white";
    if (isCurrent) return "bg-white border-green text-green";
    return "bg-white border-[#D2D5DA] text-[#A8ADB7]";
  }

  function labelClass(isCurrent: boolean, isDone: boolean): string {
    if (isDone || isCurrent) return "text-green";
    return "text-[#A8ADB7]";
  }

  function stepTrackClass(isActive: boolean): string {
    return isActive ? "bg-green" : "bg-[#E1E3E8]";
  }

  function fullTrackClass(): string {
    return [
      "absolute left-[calc(16.666667%+14px)] right-[calc(16.666667%+14px)] top-[13px] h-0.5",
      stepTrackClass(isCompleted),
    ].join(" ");
  }

  function progressTrackClass(): string {
    return [
      "absolute left-[calc(16.666667%+14px)] right-1/2 top-[13px] h-0.5",
      stepTrackClass(isConfirming || isCompleted),
    ].join(" ");
  }
</script>

{#if phase !== TxProgressPhase.IDLE}
  <div class="px-2 py-2">
    <div class="relative grid grid-cols-3 items-start px-5">
      <div class={fullTrackClass()}></div>
      <div class={progressTrackClass()}></div>

      <div class="relative z-10 flex flex-col items-center">
        <div
          class={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${stepClass(false, !isExecuting)}`}
        >
          {#if isExecuting}
            <div
              class="h-3.5 w-3.5 rounded-full border-2 border-green border-t-transparent animate-spin"
            ></div>
          {:else}
            <Check size={15} stroke-width={3} />
          {/if}
        </div>
        <p
          class={`pt-2 text-center text-[13px] font-medium ${labelClass(isExecuting, true)}`}
        >
          {executeLabel}
        </p>
      </div>

      <div class="relative z-10 flex flex-col items-center">
        <div
          class={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${stepClass(isConfirming, isCompleted)}`}
        >
          {#if isConfirming}
            <div
              class="h-3.5 w-3.5 rounded-full border-2 border-green border-t-transparent animate-spin"
            ></div>
          {:else if isCompleted}
            <Check size={15} stroke-width={3} />
          {/if}
        </div>
        <p
          class={`pt-2 text-center text-[13px] font-medium ${labelClass(isConfirming, isCompleted)}`}
        >
          {confirmLabel}
        </p>
      </div>

      <div class="relative z-10 flex flex-col items-center">
        <div
          class={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${stepClass(isCompleted, isCompleted)}`}
        >
          {#if isCompleted}
            <Check size={15} stroke-width={3} />
          {/if}
        </div>
        <p
          class={`pt-2 text-center text-[13px] font-medium ${labelClass(isCompleted, isCompleted)}`}
        >
          {locale.t(`${i18nKey}.stepDone`)}
        </p>
      </div>
    </div>
  </div>
{/if}
