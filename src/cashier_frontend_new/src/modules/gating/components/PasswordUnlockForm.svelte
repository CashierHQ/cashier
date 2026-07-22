<script lang="ts">
  import lockedLock from "$lib/assets/gating/locked-lock.svg";
  import unlockedLock from "$lib/assets/gating/unlocked-lock.svg";
  import xIcon from "$lib/assets/x-icon.svg";
  import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
  import { locale } from "$lib/i18n";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
  } from "$lib/shadcn/components/ui/drawer";
  import OTPUnlockForm from "$modules/gating/components/OTPUnlockForm.svelte";
  import XUnlockForm from "$modules/gating/components/XUnlockForm.svelte";
  import {
    gateLabel,
    isGateOpen,
    isOtpEmailGate,
    isOtpGate,
    isOtpSmsGate,
    isXGate,
  } from "$modules/gating/utils/gateHelpers";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import {
    Eye,
    EyeOff,
    Info,
    Lock,
    LockOpen,
    Mail,
    MessageSquareMore,
    RectangleEllipsis,
    Smartphone,
    X,
  } from "lucide-svelte";
  import { onMount } from "svelte";

  const {
    linkId,
    gates,
    onUnlocked,
  }: {
    linkId: string;
    gates: GateForUser[];
    onUnlocked: () => void;
  } = $props();

  let localOpenGates = $state<Record<string, boolean>>({});
  let selectedGate = $state<GateForUser | null>(null);
  let drawerOpen = $state(false);
  let password = $state("");
  let showPassword = $state(false);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);

  const allOpen = $derived(
    gates.length === 0 ||
      gates.every((gate) => isGateOpen(gate, localOpenGates)),
  );

  function openDrawer(gate: GateForUser) {
    selectedGate = gate;
    drawerOpen = true;
    password = "";
    error = null;
    showPassword = false;
  }

  async function handleOpen() {
    if (!selectedGate) return;
    isSubmitting = true;
    error = null;
    try {
      const result = await cashierBackendService.openLinkGate(
        linkId,
        selectedGate.gate.id,
        { Password: password },
      );
      if (result.isOk()) {
        localOpenGates[selectedGate.gate.id] = true;
        localOpenGates = { ...localOpenGates };
        drawerOpen = false;
      } else {
        const message = result.unwrapErr().message;
        let parsed: unknown;
        try {
          parsed = JSON.parse(message);
        } catch {
          parsed = null;
        }
        if (
          parsed &&
          typeof parsed === "object" &&
          "BackoffThrottled" in parsed
        ) {
          const backoffMsg = (parsed as { BackoffThrottled: string })
            .BackoffThrottled;
          const match = backoffMsg.match(/Try again in (\d+)s/);
          const remainingSecs = match ? parseInt(match[1], 10) : 0;
          const timeStr =
            remainingSecs >= 60
              ? `${Math.ceil(remainingSecs / 60)} minutes`
              : `${remainingSecs} seconds`;
          const template =
            locale.t("links.linkForm.lock.tooManyFailedAttempts") ??
            "Too many failed attempts. Please wait {{time}} before retrying.";
          error = template.replace("{{time}}", timeStr);
        } else if (
          parsed &&
          typeof parsed === "object" &&
          "RateLimited" in parsed
        ) {
          error =
            locale.t("links.linkForm.lock.tooManyRequests") ??
            "Too many requests. Please wait before retrying.";
        } else {
          error =
            locale.t("links.linkForm.lock.incorrectPassword") ??
            "Incorrect password.";
        }
      }
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    if (gates.length === 0) {
      onUnlocked();
    }
  });
</script>

<div class="flex grow flex-col gap-6 py-2">
  <div class="flex flex-col items-center gap-2">
    <p class="text-sm text-foreground">
      {locale.t("links.linkForm.lock.transactionIs")}
      <span class="font-medium text-green">
        {allOpen
          ? locale.t("links.linkForm.lock.notLocked")
          : locale.t("links.linkForm.lock.locked")}
      </span>
    </p>

    {#if allOpen}
      <img
        src={unlockedLock}
        alt={locale.t("links.linkForm.lock.unlockedLockAlt")}
        class="h-32 w-32"
      />
    {:else}
      <img
        src={lockedLock}
        alt={locale.t("links.linkForm.lock.lockedLockAlt")}
        class="h-32 w-32"
      />
    {/if}
  </div>

  <div class="space-y-2">
    <p class="text-sm font-medium text-foreground">
      {locale.t("links.linkForm.lock.openLocks")}
    </p>
    {#each gates as gate (gate.gate.id)}
      <button
        type="button"
        onclick={() => openDrawer(gate)}
        class="flex h-11 w-full items-center gap-3 rounded-lg border bg-background px-4 text-left transition-colors {isGateOpen(
          gate,
          localOpenGates,
        )
          ? 'border-green'
          : 'border-border'}"
      >
        {#if isXGate(gate)}
          <img
            src={xIcon}
            alt=""
            class="h-6 w-6 flex-none"
            aria-hidden="true"
          />
        {:else if isOtpSmsGate(gate)}
          <Smartphone class="h-6 w-6 flex-none text-green" aria-hidden="true" />
        {:else if isOtpEmailGate(gate)}
          <Mail class="h-6 w-6 flex-none text-green" aria-hidden="true" />
        {:else if isOtpGate(gate)}
          <MessageSquareMore
            class="h-6 w-6 flex-none text-green"
            aria-hidden="true"
          />
        {:else}
          <RectangleEllipsis
            class="h-6 w-6 flex-none text-green"
            aria-hidden="true"
          />
        {/if}
        <span class="text-sm text-foreground">{gateLabel(gate)}</span>
        {#if isGateOpen(gate, localOpenGates)}
          <LockOpen class="ml-auto h-5 w-5 text-green" aria-hidden="true" />
        {:else}
          <Lock
            class="ml-auto h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        {/if}
      </button>
    {/each}
  </div>

  <div class="flex items-center gap-2 text-sm text-green">
    <Info class="h-4 w-4 flex-none" aria-hidden="true" />
    <p>
      {locale.t("links.linkForm.lock.unlockAllRequired")}
    </p>
  </div>

  <PrimaryActionButton
    type="button"
    disabled={!allOpen}
    onclick={onUnlocked}
    class="mt-auto"
  >
    {locale.t("links.linkForm.lock.continue")}
  </PrimaryActionButton>
</div>

<Drawer bind:open={drawerOpen}>
  <DrawerContent class="max-w-full w-[400px] mx-auto p-5">
    {#if selectedGate && isXGate(selectedGate)}
      <DrawerHeader class="pb-5 pl-0 pr-0 pt-0">
        <div class="relative flex items-center justify-center">
          <DrawerTitle class="text-base font-semibold">
            {locale.t("links.linkForm.lock.openLock") ?? "Open lock"}
          </DrawerTitle>
          <DrawerClose>
            <button
              type="button"
              class="absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </DrawerClose>
        </div>
      </DrawerHeader>
      <XUnlockForm
        {linkId}
        gate={selectedGate}
        onUnlocked={() => {
          if (selectedGate) localOpenGates[selectedGate.gate.id] = true;
          localOpenGates = { ...localOpenGates };
        }}
        onClose={() => (drawerOpen = false)}
      />
    {:else if selectedGate && isOtpGate(selectedGate)}
      <OTPUnlockForm
        {linkId}
        gate={selectedGate}
        onUnlocked={() => {
          if (selectedGate) localOpenGates[selectedGate.gate.id] = true;
          localOpenGates = { ...localOpenGates };
        }}
        onClose={() => (drawerOpen = false)}
      />
    {:else}
      <DrawerHeader class="pb-5 pl-0 pr-0 pt-0">
        <div class="relative flex items-center justify-center">
          <DrawerTitle class="text-base font-semibold">
            {locale.t("links.linkForm.lock.openLock") ?? "Open lock"}
          </DrawerTitle>
          <DrawerClose>
            <button
              type="button"
              class="absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </DrawerClose>
        </div>
      </DrawerHeader>
      <div class="space-y-5">
        <div class="space-y-2">
          <label
            for="unlock-password"
            class="text-sm font-medium text-foreground"
          >
            {locale.t("links.linkForm.lock.keyPassword")}
          </label>

          <div class="relative">
            <input
              id="unlock-password"
              type={showPassword ? "text" : "password"}
              bind:value={password}
              placeholder={locale.t("links.linkForm.lock.enterPassword")}
              class="h-11 w-full rounded-lg border border-border bg-background px-4 pr-11 text-[16px] outline-none focus:border-green sm:text-sm"
            />

            <button
              type="button"
              tabindex="-1"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              onclick={() => (showPassword = !showPassword)}
            >
              {#if showPassword}
                <EyeOff class="h-5 w-5" />
              {:else}
                <Eye class="h-5 w-5" />
              {/if}
            </button>
          </div>

          {#if error}
            <p class="text-xs text-[#D26060]">{error}</p>
          {/if}
        </div>

        <PrimaryActionButton
          type="button"
          disabled={!password}
          loading={isSubmitting}
          loadingLabel={locale.t("links.linkForm.lock.processing") ??
            "Processing"}
          onclick={handleOpen}
        >
          {locale.t("links.linkForm.lock.openButton") ?? "Open"}
        </PrimaryActionButton>
      </div>
    {/if}
  </DrawerContent>
</Drawer>
