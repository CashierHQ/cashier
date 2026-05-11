<script lang="ts">
  import { locale } from "$lib/i18n";
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
  import { toast } from "svelte-sonner";
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
    toast.success(locale.t("links.linkForm.lock.lockAdded"));
  };
</script>

<div class="flex grow flex-col gap-6 py-2">
  <div class="flex flex-col items-center gap-2">
    <p class="text-sm text-foreground">
      {locale.t("links.linkForm.lock.transactionIs")}
      <span class="font-medium text-green"
        >{store.hasLocks
          ? locale.t("links.linkForm.lock.locked")
          : locale.t("links.linkForm.lock.notLocked")}</span
      >
    </p>

    {#if store.hasLocks}
      <img
        src={lockedLock}
        alt={locale.t("links.linkForm.lock.lockedLockAlt")}
        class="h-32 w-32"
      />
    {:else}
      <img
        src={unlockedLock}
        alt={locale.t("links.linkForm.lock.unlockedLockAlt")}
        class="h-32 w-32"
      />
    {/if}
  </div>

  <GateOptionList {store} onPasswordClick={() => (passwordDrawerOpen = true)} />

  {#if errorMessage}
    <p class="text-sm text-red-500">{errorMessage}</p>
  {/if}

  <div class="flex items-center gap-2 text-sm text-green">
    <Info class="h-4 w-4 flex-none" aria-hidden="true" />
    <p>{locale.t("links.linkForm.lock.allLocksRequired")}</p>
  </div>

  <Button
    type="button"
    disabled={isContinuing}
    onclick={handleContinue}
    class="mt-auto h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
  >
    {isContinuing
      ? locale.t("links.linkForm.lock.continuing")
      : locale.t("links.linkForm.lock.continue")}
  </Button>
</div>

<Drawer bind:open={passwordDrawerOpen}>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    <DrawerHeader class="pb-5 pl-0 pr-0 pt-0">
      <div class="relative flex items-center justify-center">
        <DrawerTitle class="text-base font-semibold">
          {locale.t("links.linkForm.lock.setLockKeys")}
        </DrawerTitle>
        <DrawerClose>
          <button
            type="button"
            class="absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
            aria-label={locale.t("links.linkForm.lock.closePasswordLockDrawer")}
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </DrawerClose>
      </div>
    </DrawerHeader>

    <PasswordLockForm {store} onLock={handlePasswordLock} />
  </DrawerContent>
</Drawer>
