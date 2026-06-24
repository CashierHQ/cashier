<script lang="ts">
  import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { CircleX, Info, Mail, Smartphone, X } from "lucide-svelte";

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

  function maskPhone(phone: string): string {
    const clean = phone.replace(/\s/g, "");
    if (clean.length <= 4) return clean;
    const last4 = clean.slice(-4);
    const prefix = clean.match(/^(\+\d{1,2})/)?.[1] ?? "";
    return `${prefix} ••••• ${last4}`;
  }

  function maskEmail(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    return `${local[0] ?? ""}•••••${local.slice(-4)}@${domain}`;
  }

  const maskedDestination = $derived(() => {
    const key = gate.gate.key;
    if ("OTPEmailRedacted" in key) return key.OTPEmailRedacted;
    if ("OTPSmsRedacted" in key) return key.OTPSmsRedacted;
    if ("OTPEmail" in key) return maskEmail(key.OTPEmail);
    if ("OTPSms" in key) return maskPhone(key.OTPSms);
    return "";
  });

  let step = $state<"verify" | "code">("verify");
  let digits = $state(["", "", "", "", "", ""]);
  let inputEls = $state<HTMLInputElement[]>([]);
  let isSending = $state(false);
  let isVerifying = $state(false);
  let error = $state<string | null>(null);

  const code = $derived(digits.join(""));

  async function handleSendOtp() {
    isSending = true;
    error = null;
    try {
      const result = await cashierBackendService.sendOtp(gate.gate.id);
      if (result.isOk()) {
        digits = ["", "", "", "", "", ""];
        step = "code";
      } else {
        error = result.unwrapErr().message;
      }
    } finally {
      isSending = false;
    }
  }

  function focusDigit(index: number) {
    inputEls[index]?.focus();
  }

  function handleDigitInput(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    digits[index] = digit;
    digits = [...digits];
    if (digit && index < 5) focusDigit(index + 1);
  }

  function handleDigitKeydown(index: number, e: KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      focusDigit(index - 1);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData("text")?.replace(/\D/g, "") ?? "";
    if (pasted.length === 0) return;
    e.preventDefault();
    const newDigits = [...digits];
    for (let i = 0; i < 6 && i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    digits = newDigits;
    const nextEmpty = newDigits.findIndex((d) => d === "");
    focusDigit(nextEmpty === -1 ? 5 : nextEmpty);
  }

  async function handleVerify() {
    if (code.length < 6) return;
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
          const timeStr =
            remainingSecs >= 60
              ? `${Math.ceil(remainingSecs / 60)} minutes`
              : `${remainingSecs} seconds`;
          const template =
            locale.t("links.linkForm.lock.tooManyFailedAttempts") ??
            "Too many failed attempts. Please wait {{time}} before retrying.";
          error = template.replace("{{time}}", timeStr);
        } else {
          error = "Invalid or expired code. Please try again.";
        }
      }
    } finally {
      isVerifying = false;
    }
  }
</script>

<!-- Internal header (title changes between steps, so managed here) -->
<div class="flex h-[30px] items-center justify-between pl-6">
  <h2 class="flex-1 text-center text-lg font-semibold text-[#0c111d]">
    {step === "verify" ? "Verify to unlock" : "Enter code"}
  </h2>
  <button
    type="button"
    onclick={onClose}
    class="flex-none text-foreground"
    aria-label="Close"
  >
    <X class="h-5 w-5" aria-hidden="true" />
  </button>
</div>

<div class="mt-6 space-y-6">
  {#if step === "verify"}
    <!-- Step 1: Verify to unlock -->
    <p class="text-sm text-foreground">
      {#if isEmail}
        This transaction is locked to one email address. We'll send a code there
        to confirm it's you.
      {:else}
        This transaction is locked to one phone number. We'll send a code there
        to confirm it's you.
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
      <span class="text-lg font-semibold text-green">{maskedDestination()}</span
      >
    </div>

    <!-- Hint -->
    <div class="flex items-start gap-1.5 text-green">
      <Info class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <p class="text-sm">
        {#if isEmail}
          Don't recognize this email? The link isn't meant for you.
        {:else}
          Don't recognize this number? The link isn't meant for you.
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

    <Button
      type="button"
      disabled={isSending}
      onclick={handleSendOtp}
      class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
    >
      {#if isSending}
        <div
          class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
        ></div>
        Sending…
      {:else}
        Send code
      {/if}
    </Button>
  {:else}
    <!-- Step 2: Enter code -->
    <p class="text-center text-sm text-foreground">
      Code sent to <span class="font-semibold text-green"
        >{maskedDestination()}</span
      >
    </p>

    <!-- 6 digit inputs -->
    <div class="flex items-center justify-center gap-1.5">
      {#each digits as digit, i (i)}
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
          aria-label="Digit {i + 1}"
        />
      {/each}
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

    <Button
      type="button"
      disabled={code.length < 6 || isVerifying}
      onclick={handleVerify}
      class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
    >
      {#if isVerifying}
        <div
          class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
        ></div>
        {locale.t("links.linkForm.lock.processing") ?? "Processing"}
      {:else}
        Verify &amp; unlock
      {/if}
    </Button>
  {/if}
</div>
