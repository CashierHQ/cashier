<script lang="ts">
  import { locale } from "$lib/i18n";
  import { Button } from "$lib/shadcn/components/ui/button";
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
  } from "$lib/shadcn/components/ui/drawer";
  import type {
    PreviewGateDraft,
    TransactionLocksDrawerProps,
  } from "$modules/creationLink/types";
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

  function getGateKey(lock: PreviewGateDraft) {
    if (!("gate" in lock) || typeof lock.gate !== "object" || !lock.gate) {
      return undefined;
    }

    return "key" in lock.gate &&
      typeof lock.gate.key === "object" &&
      lock.gate.key
      ? lock.gate.key
      : undefined;
  }

  function getLockType(lock: PreviewGateDraft) {
    const gateKey = getGateKey(lock);
    if (gateKey) {
      if ("Password" in gateKey || "PasswordRedacted" in gateKey) {
        return GateType.PASSWORD;
      }
      if ("XFollowing" in gateKey) {
        return "xHandle";
      }
    }

    return "type" in lock && typeof lock.type === "string" ? lock.type : "";
  }

  function getLockLabel(lock: PreviewGateDraft) {
    const type = getLockType(lock);

    if (type === GateType.PASSWORD) {
      return locale.t("links.linkForm.lock.password");
    }

    if (type === "xHandle") {
      return locale.t("links.linkForm.lock.xHandle");
    }

    return locale.t("links.linkForm.lock.configuredLock");
  }

  function togglePasswordVisibility(index: number) {
    if (visiblePasswordIndexes.has(index)) {
      visiblePasswordIndexes.delete(index);
    } else {
      visiblePasswordIndexes.add(index);
    }
  }

  function getSensitivePassword(lock: PreviewGateDraft) {
    const gateKey = getGateKey(lock);
    if (
      gateKey &&
      "Password" in gateKey &&
      typeof gateKey.Password === "string"
    ) {
      return gateKey.Password;
    }
    if ("password" in lock && typeof lock.password === "string") {
      return lock.password;
    }
    return undefined;
  }

  function canRevealSensitiveValue(lock: PreviewGateDraft) {
    return (
      getLockType(lock) === GateType.PASSWORD &&
      getSensitivePassword(lock) !== undefined
    );
  }

  function getLockValue(lock: PreviewGateDraft, revealSensitiveValue = false) {
    const type = getLockType(lock);

    if (type === GateType.PASSWORD) {
      const password = getSensitivePassword(lock);
      if (!password) return "*".repeat(12);
      if (revealSensitiveValue) return password;
      return "*".repeat(Math.max(password.length, 12));
    }

    const gateKey = getGateKey(lock);
    if (gateKey) {
      if ("XFollowing" in gateKey && typeof gateKey.XFollowing === "string") {
        return gateKey.XFollowing;
      }
      if (
        "DiscordServer" in gateKey &&
        typeof gateKey.DiscordServer === "string"
      ) {
        return gateKey.DiscordServer;
      }
      if (
        "TelegramGroup" in gateKey &&
        typeof gateKey.TelegramGroup === "string"
      ) {
        return gateKey.TelegramGroup;
      }
    }

    return locale.t("links.linkForm.lock.configuredLock");
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
      {#each locks as lock, index (getLockType(lock) + index)}
        {@const lockType = getLockType(lock)}
        {@const showPassword = visiblePasswordIndexes.has(index)}
        {@const canRevealPassword = canRevealSensitiveValue(lock)}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              {#if lockType === GateType.PASSWORD}
                <RectangleEllipsis
                  class="h-6 w-6 text-green"
                  aria-hidden="true"
                />
              {:else}
                <Lock class="h-6 w-6 text-green" aria-hidden="true" />
              {/if}
              <p class="text-sm font-medium">
                {getLockLabel(lock)}
              </p>
            </div>

            <Lock class="h-5 w-5 text-green" aria-hidden="true" />
          </div>

          <div class="relative">
            <input
              readonly
              value={getLockValue(lock, showPassword)}
              class="h-11 w-full rounded-lg border border-border bg-[#F7F7F7] px-4 pr-11 text-sm text-foreground outline-none"
            />

            {#if lockType === GateType.PASSWORD && canRevealPassword}
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

    <Button
      type="button"
      class="mt-7 h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90"
      onclick={handleClose}
    >
      {locale.t("links.linkForm.drawers.transactionLocks.closeButton")}
    </Button>
  </DrawerContent>
</Drawer>
