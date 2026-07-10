<script lang="ts">
  import { locale } from "$lib/i18n";
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
  } from "$lib/shadcn/components/ui/drawer";
  import type { TransactionLocksDrawerProps } from "$modules/creationLink/types";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import {
    getTransactionLockDisplay,
    getTransactionLockStableKey,
  } from "$modules/gating/services/transactionLockDisplay";
  import { GateType } from "$modules/gating/types/gate";
  import { SvelteSet } from "svelte/reactivity";
  import {
    ChevronLeft,
    Eye,
    EyeOff,
    Lock,
    RectangleEllipsis,
  } from "lucide-svelte";

  let {
    open = $bindable(false),
    locks = [],
    onClose,
    onBack,
    onOpenChange,
  }: TransactionLocksDrawerProps = $props();

  let visiblePasswordIndexes = new SvelteSet<number>();

  function handleClose() {
    open = false;
    onClose?.();
  }

  function handleBack() {
    open = false;
    onBack?.();
    onClose?.();
  }

  function togglePasswordVisibility(index: number) {
    if (visiblePasswordIndexes.has(index)) {
      visiblePasswordIndexes.delete(index);
    } else {
      visiblePasswordIndexes.add(index);
    }
  }
</script>

<Drawer bind:open {onOpenChange}>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="px-0 pt-2 pb-5">
      <div class="grid grid-cols-[40px_1fr_70px] items-center">
        <button
          class="flex h-10 w-10 items-center justify-start cursor-pointer"
          onclick={handleBack}
          type="button"
          aria-label={locale.t("links.linkForm.drawers.transactionLocks.back")}
        >
          <ChevronLeft size={24} />
        </button>

        <DrawerTitle class="text-center text-[18px] font-semibold leading-5">
          {locale.t("links.linkForm.drawers.transactionLocks.title")}
        </DrawerTitle>

        <p class="text-right text-[10px] font-semibold text-muted-foreground">
          {locks.length}
          {locale.t("links.linkForm.drawers.transactionLocks.activeLabel")}
        </p>
      </div>
    </DrawerHeader>

    <div class="space-y-6">
      {#each locks as lock, index (getTransactionLockStableKey(lock, index))}
        {@const showPassword = visiblePasswordIndexes.has(index)}
        {@const display = getTransactionLockDisplay(lock, {
          revealSensitiveValue: showPassword,
        })}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              {#if display.type === GateType.PASSWORD}
                <RectangleEllipsis
                  class="h-6 w-6 text-green"
                  aria-hidden="true"
                />
              {:else}
                <Lock class="h-6 w-6 text-green" aria-hidden="true" />
              {/if}
              <p class="text-sm font-medium">
                {locale.t(display.labelKey)}
              </p>
            </div>

            <Lock class="h-5 w-5 text-green" aria-hidden="true" />
          </div>

          <div class="relative">
            <input
              readonly
              value={display.value}
              class="h-11 w-full rounded-lg border border-border bg-[#F7F7F7] px-4 pr-11 text-sm text-foreground outline-none"
            />

            {#if display.type === GateType.PASSWORD && display.canRevealSensitiveValue}
              <button
                type="button"
                class="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground"
                aria-label={showPassword
                  ? locale.t("links.linkForm.lock.hidePassword")
                  : locale.t("links.linkForm.lock.showPassword")}
                onclick={() => togglePasswordVisibility(index)}
              >
                {#if showPassword}
                  <EyeOff class="h-5 w-5" aria-hidden="true" />
                {:else}
                  <Eye class="h-5 w-5" aria-hidden="true" />
                {/if}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <PrimaryActionButton type="button" class="mt-7" onclick={handleClose}>
      {locale.t("links.linkForm.drawers.transactionLocks.closeButton")}
    </PrimaryActionButton>
  </DrawerContent>
</Drawer>
