<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { Info, Mail, Phone, X } from "lucide-svelte";

  const {
    store,
    onLock,
  }: {
    store: GatingStore;
    onLock: () => void;
  } = $props();

  let submitted = $state(false);
  let emailEnabled = $state(false);
  let phoneEnabled = $state(false);

  const hasAnyError = $derived(
    (emailEnabled && store.otpEmailSetupError !== null) ||
      (phoneEnabled && store.otpPhoneSetupError !== null),
  );

  const hasAnyEnabled = $derived(emailEnabled || phoneEnabled);

  function toggleEmail() {
    emailEnabled = !emailEnabled;
    if (emailEnabled) {
      phoneEnabled = false;
      store.clearOTPPhoneDraft();
    } else {
      store.clearOTPEmailDraft();
    }
  }

  function togglePhone() {
    phoneEnabled = !phoneEnabled;
    if (phoneEnabled) {
      emailEnabled = false;
      store.clearOTPEmailDraft();
    } else {
      store.clearOTPPhoneDraft();
    }
  }

  const handleLock = () => {
    submitted = true;
    if (!hasAnyEnabled || hasAnyError) return;

    if (emailEnabled) store.saveOTPEmailLock();
    if (phoneEnabled) store.saveOTPSmsLock();
    onLock();
  };
</script>

<div class="space-y-6">
  <!-- Email option -->
  <div class="space-y-1.5 {emailEnabled ? '' : 'opacity-40'}">
    <p class="text-sm font-medium text-foreground">Email OTP</p>
    <div class="flex items-center gap-5">
      <div
        class="flex h-10 flex-1 items-center gap-1 rounded-lg border bg-background px-3 py-2
          {submitted && emailEnabled && store.otpEmailSetupError
          ? 'border-[#D26060]'
          : 'border-[#d0d5dd]'}"
      >
        <Mail
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="email"
          disabled={!emailEnabled}
          value={store.otpEmailDraft}
          oninput={(e) =>
            store.setOTPEmailDraft((e.currentTarget as HTMLInputElement).value)}
          placeholder="recipient@example.com"
          class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#d9d9d9] disabled:cursor-not-allowed"
        />
        {#if emailEnabled && store.otpEmailDraft}
          <button
            type="button"
            onclick={() => store.setOTPEmailDraft("")}
            class="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Clear email"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={toggleEmail}
        aria-label="Toggle email OTP gate"
        class="flex h-5 w-9 flex-none items-center overflow-hidden rounded-full p-0.5 {emailEnabled
          ? 'justify-end bg-green'
          : 'bg-[#e8f2ee]'}"
      >
        <div class="h-4 w-4 rounded-full bg-white shadow-sm"></div>
      </button>
    </div>
    {#if submitted && emailEnabled && store.otpEmailSetupError}
      <p class="text-xs text-[#D26060]">{store.otpEmailSetupError}</p>
    {/if}
  </div>

  <!-- Phone option -->
  <div class="space-y-1.5 {phoneEnabled ? '' : 'opacity-40'}">
    <p class="text-sm font-medium text-foreground">SMS OTP</p>
    <div class="flex items-center gap-5">
      <div
        class="flex h-10 flex-1 items-center gap-1 rounded-lg border bg-background px-3 py-2
          {submitted && phoneEnabled && store.otpPhoneSetupError
          ? 'border-[#D26060]'
          : 'border-[#d0d5dd]'}"
      >
        <Phone
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="tel"
          disabled={!phoneEnabled}
          value={store.otpPhoneDraft}
          oninput={(e) =>
            store.setOTPPhoneDraft((e.currentTarget as HTMLInputElement).value)}
          placeholder="+1 234 567 8900"
          class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-[#d9d9d9] disabled:cursor-not-allowed"
        />
        {#if phoneEnabled && store.otpPhoneDraft}
          <button
            type="button"
            onclick={() => store.setOTPPhoneDraft("")}
            class="flex-none text-muted-foreground hover:text-foreground"
            aria-label="Clear phone"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        {/if}
      </div>
      <button
        type="button"
        onclick={togglePhone}
        aria-label="Toggle SMS OTP gate"
        class="flex h-5 w-9 flex-none items-center overflow-hidden rounded-full p-0.5 {phoneEnabled
          ? 'justify-end bg-green'
          : 'bg-[#e8f2ee]'}"
      >
        <div class="h-4 w-4 rounded-full bg-white shadow-sm"></div>
      </button>
    </div>
    {#if submitted && phoneEnabled && store.otpPhoneSetupError}
      <p class="text-xs text-[#D26060]">{store.otpPhoneSetupError}</p>
    {/if}
  </div>

  <!-- Info note -->
  <div class="flex items-start gap-1.5 text-green">
    <Info class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
    <p class="text-sm">
      Choose one channel — email or SMS. The recipient will receive a one-time
      code to unlock.
    </p>
  </div>

  <Button
    type="button"
    disabled={!hasAnyEnabled}
    onclick={handleLock}
    class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
  >
    Lock
  </Button>
</div>
