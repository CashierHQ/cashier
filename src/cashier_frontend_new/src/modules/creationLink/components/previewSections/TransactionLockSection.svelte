<script lang="ts">
  import { locale } from "$lib/i18n";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { Lock, LockOpen } from "lucide-svelte";

  type Props = {
    gatingStore?: GatingStore;
    isEnded?: boolean;
  };

  let { gatingStore, isEnded = false }: Props = $props();
</script>

<div
  class="flex flex-row items-center justify-between border-lightgreen border-[1px] rounded-lg px-5 py-3"
>
  <p class="font-medium text-sm">
    {locale.t("links.linkForm.preview.transactionLock")}
  </p>
  <div
    class="flex items-center gap-1 text-sm text-green"
    class:text-red-600={isEnded}
  >
    <span
      >{gatingStore?.hasLocks
        ? locale.t("links.linkForm.preview.transactionLockStatus.locked")
        : locale.t(
            "links.linkForm.preview.transactionLockStatus.unlocked",
          )}</span
    >
    {#if gatingStore?.hasLocks}
      <Lock class="h-4 w-4" aria-hidden="true" />
    {:else}
      <LockOpen class="h-4 w-4" aria-hidden="true" />
    {/if}
  </div>
</div>
