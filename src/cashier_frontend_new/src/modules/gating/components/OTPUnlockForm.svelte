<script lang="ts">
  import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { cashierBackendService } from "$modules/links/services/cashierBackend";
  import { CircleAlert, CircleX, Mail, Phone, Send } from "lucide-svelte";

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

  const isEmail = $derived("OTPEmail" in gate.gate.key);
  const destination = $derived(
    "OTPEmail" in gate.gate.key
      ? gate.gate.key.OTPEmail
      : "OTPSms" in gate.gate.key
        ? gate.gate.key.OTPSms
        : "",
  );

  let otpCode = $state("");
  let isSending = $state(false);
  let isVerifying = $state(false);
  let codeSent = $state(false);
  let error = $state<string | null>(null);

  async function handleSendOtp() {
    isSending = true;
    error = null;
    try {
      const result = await cashierBackendService.sendOtp(gate.gate.id);
      if (result.isOk()) {
        codeSent = true;
        otpCode = "";
      } else {
        error = result.unwrapErr().message;
      }
    } finally {
      isSending = false;
    }
  }

  async function handleVerify() {
    if (!otpCode.trim()) return;
    isVerifying = true;
    error = null;
    try {
      const credential = isEmail
        ? { OTPEmail: otpCode.trim() }
        : { OTPSms: otpCode.trim() };
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
          error = "Invalid or expired OTP code. Please request a new code.";
        }
      }
    } finally {
      isVerifying = false;
    }
  }
</script>

<div class="space-y-5">
  <!-- Destination info -->
  <div class="space-y-1.5">
    <p class="text-sm font-medium text-foreground">
      {isEmail ? "Email OTP" : "SMS OTP"}
    </p>
    <div
      class="flex h-10 items-center gap-2 rounded-lg border border-[#ebebeb] px-3 py-2 text-sm"
    >
      {#if isEmail}
        <Mail
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
      {:else}
        <Phone
          class="h-4 w-4 flex-none text-muted-foreground"
          aria-hidden="true"
        />
      {/if}
      <span class="flex-1 truncate text-foreground">{destination}</span>
    </div>
  </div>

  <!-- Send OTP button -->
  <Button
    type="button"
    disabled={isSending}
    onclick={handleSendOtp}
    class="h-10 w-full rounded-lg border border-green bg-transparent text-green hover:bg-green/10 disabled:opacity-50"
  >
    {#if isSending}
      <div
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-green border-t-transparent"
      ></div>
      Sending…
    {:else}
      <Send class="mr-2 h-4 w-4" aria-hidden="true" />
      {codeSent ? "Resend OTP" : "Receive OTP"}
    {/if}
  </Button>

  <!-- OTP input (shown after code sent) -->
  {#if codeSent}
    <div class="space-y-1.5">
      <p class="text-sm font-medium text-foreground">Enter the 6-digit code</p>
      <input
        type="text"
        inputmode="numeric"
        maxlength={6}
        bind:value={otpCode}
        placeholder="123456"
        class="h-11 w-full rounded-lg border border-border bg-background px-4 text-center text-lg tracking-widest outline-none focus:border-green"
      />
    </div>
  {/if}

  <!-- Error banner -->
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

  <!-- Info note -->
  <div class="flex items-start gap-1.5 text-green">
    <CircleAlert class="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
    <p class="text-sm">
      The code expires in 10 minutes. Request a new one if it expires.
    </p>
  </div>

  <Button
    type="button"
    disabled={!codeSent || !otpCode.trim() || isVerifying}
    onclick={handleVerify}
    class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90 disabled:bg-disabledgreen"
  >
    {#if isVerifying}
      <div
        class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
      ></div>
      {locale.t("links.linkForm.lock.processing") ?? "Processing"}
    {:else}
      {locale.t("links.linkForm.lock.openButton") ?? "Open"}
    {/if}
  </Button>
</div>
