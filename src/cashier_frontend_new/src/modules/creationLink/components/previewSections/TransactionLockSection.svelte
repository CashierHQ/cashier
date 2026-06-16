<script lang="ts">
  import { locale } from "$lib/i18n";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { ChevronRight, Lock, LockOpen } from "lucide-svelte";

  type Props = {
    gatingStore?: GatingStore;
    hasLocks?: boolean;
    isEnded?: boolean;
    onLockClick?: () => void;
  };

  let { gatingStore, hasLocks, isEnded = false, onLockClick }: Props = $props();
  const showLocked = $derived(gatingStore?.hasLocks ?? hasLocks ?? false);
</script>

{#if showLocked && onLockClick}
  <button
    type="button"
    class="border-[1px] rounded-lg border-lightgreen px-4 py-3 w-full text-left transition-colors cursor-pointer hover:bg-gray-50"
    onclick={onLockClick}
  >
    <div class="flex justify-between items-center">
      <p class="text-[14px] font-medium">
        {locale.t("links.linkForm.preview.transactionLock")}
      </p>

      <div class="flex items-center gap-2 text-[14px] font-normal">
        <span>
          {locale.t("links.linkForm.preview.transactionLockStatus.locked")}
        </span>
        <ChevronRight size={18} />
      </div>
    </div>
  </button>
{:else}
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
        >{showLocked
          ? locale.t("links.linkForm.preview.transactionLockStatus.locked")
          : locale.t(
              "links.linkForm.preview.transactionLockStatus.unlocked",
            )}</span
      >
      {#if showLocked}
        <Lock class="h-4 w-4" aria-hidden="true" />
      {:else}
        <LockOpen class="h-4 w-4" aria-hidden="true" />
      {/if}
    </div>
  </div>
{/if}
