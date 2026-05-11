<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
  } from "$lib/shadcn/components/ui/drawer";
  import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import GateOptionList from "$modules/gating/components/GateOptionList.svelte";
  import PasswordLockForm from "$modules/gating/components/PasswordLockForm.svelte";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { Info, X } from "lucide-svelte";
  import lockedLock from "$lib/assets/gating/locked-lock.svg";
  import unlockedLock from "$lib/assets/gating/unlocked-lock.svg";

  const {
    link,
    store,
  }: {
    link: GenericCreationLinkStoreVM;
    store: GatingStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let isContinuing = $state(false);
  let passwordDrawerOpen = $state(false);
  let showLockAddedNotice = $state(store.hasConfiguredPassword);

  const handleContinue = async () => {
    errorMessage = null;

    try {
      isContinuing = true;
      await link.goNext();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      isContinuing = false;
    }
  };

  const handlePasswordLock = () => {
    passwordDrawerOpen = false;
    showLockAddedNotice = true;
  };
</script>

<div class="flex grow flex-col gap-6 py-2">
  <div class="flex flex-col items-center gap-2">
    <p class="text-sm text-foreground">
      Transaction is <span class="font-medium text-green"
        >{store.hasLocks ? "locked" : "not locked"}</span
      >
    </p>

    {#if store.hasLocks}
      <img src={lockedLock} alt="Locked lock" class="h-32 w-32" />
    {:else}
      <img src={unlockedLock} alt="Unlocked lock" class="h-32 w-32" />
    {/if}
  </div>

  <GateOptionList {store} onPasswordClick={() => (passwordDrawerOpen = true)} />

  {#if showLockAddedNotice && store.hasConfiguredPassword}
    <div
      class="flex h-12 items-center gap-3 rounded-xl bg-[#FFF8EC] px-4 text-sm text-green"
    >
      <Info class="h-4 w-4 flex-none" aria-hidden="true" />
      <span class="font-medium">You added a lock</span>
      <button
        type="button"
        class="ml-auto text-muted-foreground"
        aria-label="Dismiss lock added message"
        onclick={() => (showLockAddedNotice = false)}
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  {/if}

  {#if errorMessage}
    <p class="text-sm text-red-500">{errorMessage}</p>
  {/if}

  <div class="flex items-center gap-2 text-sm text-green">
    <Info class="h-4 w-4 flex-none" aria-hidden="true" />
    <p>User must open all locks to use transaction</p>
  </div>

  <Button
    type="button"
    disabled={isContinuing}
    onclick={handleContinue}
    class="mt-auto h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
  >
    {isContinuing ? "Continuing..." : "Continue"}
  </Button>
</div>

<Drawer bind:open={passwordDrawerOpen}>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="pb-5 pl-0 pr-0 pt-0">
      <div class="relative flex items-center justify-center">
        <DrawerTitle class="text-base font-semibold">Set lock keys</DrawerTitle>
        <DrawerClose>
          <button
            type="button"
            class="absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
            aria-label="Close password lock drawer"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </DrawerClose>
      </div>
    </DrawerHeader>

    <PasswordLockForm {store} onLock={handlePasswordLock} />
  </DrawerContent>
</Drawer>
