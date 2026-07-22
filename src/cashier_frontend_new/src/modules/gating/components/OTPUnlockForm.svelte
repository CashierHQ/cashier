<script lang="ts">
  import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
  import { locale } from "$lib/i18n";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { otpUnlockSessionStore } from "$modules/gating/state/otpUnlockSessionStore.svelte";
  import { getBackoffTimeText } from "$modules/gating/utils/backoffTime";
  import { CircleX, Info, Mail, Smartphone, X } from "lucide-svelte";
  import { onDestroy, onMount } from "svelte";

  const {
    linkId,
    gate,
    onUnlocked,
    onClose,
  }: {
    linkId: string;
    gate: GateForUser;
    onUnlocked: () => void;
    onClose: () => void;
  } = $props();

  const isEmail = $derived(
    "OTPEmail" in gate.gate.key || "OTPEmailRedacted" in gate.gate.key,
  );

  const destination = $derived.by(() => {
    const key = gate.gate.key;
    if ("OTPEmail" in key) return key.OTPEmail;
    if ("OTPSms" in key) return key.OTPSms;
    if ("OTPEmailRedacted" in key) return key.OTPEmailRedacted;
    if ("OTPSmsRedacted" in key) return key.OTPSmsRedacted;
    return "";
  });

  let inputEls = $state<HTMLInputElement[]>([]);
  let isSending = $state(false);
  let isResending = $state(false);
  let isVerifying = $state(false);
  let error = $state<string | null>(null);
  let now = $state(Date.now());
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  const sessionKey = $derived(`${linkId}:${gate.gate.id}:${destination}`);
  const session = $derived.by(() =>
    otpUnlockSessionStore.getSession(sessionKey),
  );
  const code = $derived(session.digits.join(""));
  const remainingSeconds = $derived.by(() => secondsUntil(session.expiresAtMs));
  const resendRemainingSeconds = $derived.by(() =>
    secondsUntil(session.resendAvailableAtMs),
  );
  const verifyRemainingSeconds = $derived.by(() =>
    secondsUntil(session.verifyAvailableAtMs),
  );
  const formattedRemainingTime = $derived.by(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  });
  const expiryText = $derived(
    locale
      .t("links.linkForm.lock.otp.codeExpiresIn")
      .replace("{{time}}", formattedRemainingTime),
  );
  const resendInText = $derived(
    locale
      .t("links.linkForm.lock.otp.resendIn")
      .replace("{{time}}", getBackoffTimeText(resendRemainingSeconds)),
  );
  const tryAgainText = $derived(
    locale
      .t("links.linkForm.lock.otp.tryAgainIn")
      .replace("{{time}}", getBackoffTimeText(verifyRemainingSeconds)),
  );

  function secondsUntil(timestamp: number | null | undefined) {
    if (!timestamp) return 0;
    return Math.max(0, Math.ceil((timestamp - now) / 1000));
  }

  async function handleSendOtp() {
    isSending = true;
    error = null;
    try {
      const result = await cashierBackendService.sendOtp(gate.gate.id);
      if (result.isOk()) {
        otpUnlockSessionStore.markCodeSent(sessionKey);
      } else {
        error = result.unwrapErr().message;
      }
    } finally {
      isSending = false;
    }
  }

  async function handleResendOtp() {
    if (resendRemainingSeconds > 0 || isResending) return;

    isResending = true;
    error = null;
    try {
      const result = await cashierBackendService.sendOtp(gate.gate.id);
      if (result.isOk()) {
        otpUnlockSessionStore.markCodeSent(sessionKey);
        focusDigit(0);
      } else {
        error = result.unwrapErr().message;
      }
    } finally {
      isResending = false;
    }
  }

  function focusDigit(index: number) {
    inputEls[index]?.focus();
  }

  function handleDigitInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...session.digits];
    nextDigits[index] = digit;
    otpUnlockSessionStore.setDigits(sessionKey, nextDigits);
    if (digit && index < 5) focusDigit(index + 1);
  }

  function handleDigitKeydown(index: number, e: KeyboardEvent) {
    if (e.key === "Backspace" && !session.digits[index] && index > 0) {
      focusDigit(index - 1);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData("text")?.replace(/\D/g, "") ?? "";
    if (pasted.length === 0) return;
    e.preventDefault();
    const newDigits = [...session.digits];
    for (let i = 0; i < 6 && i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    otpUnlockSessionStore.setDigits(sessionKey, newDigits);
    const nextEmpty = newDigits.findIndex((d) => d === "");
    focusDigit(nextEmpty === -1 ? 5 : nextEmpty);
  }

  async function handleVerify() {
    if (code.length < 6 || verifyRemainingSeconds > 0) return;
    isVerifying = true;
    error = null;
    try {
      const credential = isEmail ? { OTPEmail: code } : { OTPSms: code };
      const result = await cashierBackendService.openLinkGate(
        linkId,
        gate.gate.id,
        credential,
      );
      if (result.isOk()) {
        otpUnlockSessionStore.clear(sessionKey);
        onUnlocked();
        onClose();
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
          otpUnlockSessionStore.setVerifyCooldown(sessionKey, remainingSecs);
          const template =
            locale.t("links.linkForm.lock.tooManyFailedAttempts") ??
            locale.t("links.linkForm.lock.otp.errors.tooManyFailedAttempts");
          error = template.replace(
            "{{time}}",
            getBackoffTimeText(remainingSecs),
          );
        } else {
          otpUnlockSessionStore.setVerifyCooldown(sessionKey);
          error = locale.t("links.linkForm.lock.otp.errors.invalidCode");
        }
      }
    } finally {
      isVerifying = false;
    }
  }

  onMount(() => {
    tickInterval = setInterval(() => {
      now = Date.now();
    }, 1000);
  });

  onDestroy(() => {
    if (tickInterval) {
      clearInterval(tickInterval);
    }
  });
</script>

<!-- Internal header (title changes between steps, so managed here) -->
<div class="flex h-[30px] items-center justify-between pl-6">
  <h2 class="flex-1 text-center text-lg font-semibold text-[#0c111d]">
    {session.step === "verify"
      ? locale.t("links.linkForm.lock.otp.verifyToUnlock")
      : locale.t("links.linkForm.lock.otp.enterCode")}
  </h2>
  <button
    type="button"
    onclick={onClose}
    class="flex-none text-foreground"
    aria-label={locale.t("links.linkForm.lock.otp.closeUnlockDrawer")}
  >
    <X class="h-5 w-5" aria-hidden="true" />
  </button>
</div>

<div class="mt-6 space-y-6">
  {#if session.step === "verify"}
    <!-- Step 1: Verify to unlock -->
    <p class="text-sm text-foreground">
      {#if isEmail}
        {locale.t("links.linkForm.lock.otp.emailUnlockDescription")}
      {:else}
        {locale.t("links.linkForm.lock.otp.phoneUnlockDescription")}
      {/if}
    </p>

    <!-- Destination card -->
    <div
      class="flex items-center justify-center gap-3 rounded-xl bg-[#e8f2ee] p-3"
    >
      {#if isEmail}
        <Mail class="h-5 w-5 flex-none text-green" aria-hidden="true" />
      {:else}
        <Smartphone class="h-5 w-5 flex-none text-green" aria-hidden="true" />
      {/if}
      <span class="text-lg font-semibold text-green">{destination}</span>
    </div>

    <!-- Hint -->
    <div class="flex items-start gap-1.5 text-green">
      <Info class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <p class="text-sm">
        {#if isEmail}
          {locale.t("links.linkForm.lock.otp.emailNotRecognized")}
        {:else}
          {locale.t("links.linkForm.lock.otp.phoneNotRecognized")}
        {/if}
      </p>
    </div>

    {#if error}
      <div
        class="flex items-center gap-3 rounded-xl bg-[#fffaf2] px-4 py-3 shadow-sm"
      >
        <div
          class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#d26060]"
        >
          <CircleX class="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
        <p class="flex-1 text-sm font-semibold text-foreground">{error}</p>
      </div>
    {/if}

    <PrimaryActionButton
      type="button"
      loading={isSending}
      loadingLabel={locale.t("links.linkForm.lock.otp.sendingCode")}
      onclick={handleSendOtp}
    >
      {locale.t("links.linkForm.lock.otp.sendCode")}
    </PrimaryActionButton>
  {:else}
    <!-- Step 2: Enter code -->
    <div class="space-y-1 text-center">
      <p class="text-sm text-foreground">
        {locale.t("links.linkForm.lock.otp.codeSentTo")}
        <span class="font-semibold text-green">{destination}</span>
      </p>
      {#if isEmail}
        <p class="text-xs text-foreground">
          {locale.t("links.linkForm.lock.otp.checkSpam")}
        </p>
      {/if}
      <p class="text-xs text-muted-foreground">{expiryText}</p>
    </div>

    <!-- 6 digit inputs -->
    <div class="space-y-3">
      <div class="flex items-center justify-center gap-1.5">
        {#each session.digits as digit, i (i)}
          <input
            bind:this={inputEls[i]}
            type="text"
            inputmode="numeric"
            maxlength={1}
            value={digit}
            oninput={(e) =>
              handleDigitInput(i, (e.currentTarget as HTMLInputElement).value)}
            onkeydown={(e) => handleDigitKeydown(i, e)}
            onpaste={handlePaste}
            class="flex h-12 w-12 items-center justify-center rounded-[7.5px] border text-center text-3xl font-medium text-green outline-none transition-colors
            {digit
              ? 'border-[#36a18b]'
              : 'border-[#d9d9d9] focus:border-[#36a18b]'}"
            aria-label={locale
              .t("links.linkForm.lock.otp.digitAriaLabel")
              .replace("{{number}}", String(i + 1))}
          />
        {/each}
      </div>

      <p class="text-center text-xs text-foreground">
        {locale.t("links.linkForm.lock.otp.didNotGetIt")}
        <button
          type="button"
          class="font-semibold text-green disabled:cursor-not-allowed disabled:text-muted-foreground"
          disabled={resendRemainingSeconds > 0 || isResending}
          onclick={handleResendOtp}
        >
          {#if isResending}
            {locale.t("links.linkForm.lock.otp.resendingCode")}
          {:else if resendRemainingSeconds > 0}
            {resendInText}
          {:else}
            {locale.t("links.linkForm.lock.otp.resendCode")}
          {/if}
        </button>
      </p>
    </div>

    {#if error}
      <div
        class="flex items-center gap-3 rounded-xl bg-[#fffaf2] px-4 py-3 shadow-sm"
      >
        <div
          class="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#d26060]"
        >
          <CircleX class="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
        <p class="flex-1 text-sm font-semibold text-foreground">{error}</p>
      </div>
    {/if}

    <PrimaryActionButton
      type="button"
      disabled={code.length < 6 || verifyRemainingSeconds > 0}
      loading={isVerifying}
      loadingLabel={locale.t("links.linkForm.lock.processing") ?? "Processing"}
      onclick={handleVerify}
    >
      {#if verifyRemainingSeconds > 0}
        {tryAgainText}
      {:else}
        {locale.t("links.linkForm.lock.otp.verifyAndUnlock")}
      {/if}
    </PrimaryActionButton>
  {/if}
</div>
