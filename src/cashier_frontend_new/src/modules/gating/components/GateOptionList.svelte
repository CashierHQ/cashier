<script lang="ts">
  import coinTokenIcon from "$lib/assets/gating/coin-token-icon.svg";
  import quizIcon from "$lib/assets/gating/quiz-icon.svg";
  import telegramIcon from "$lib/assets/telegram-icon.svg";
  import xIcon from "$lib/assets/x-icon.svg";
  import { locale } from "$lib/i18n";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { GateType } from "$modules/gating/types/gate";
  import { Lock, MessageSquareMore, RectangleEllipsis } from "lucide-svelte";

  const {
    store,
    onPasswordClick,
    onXClick,
    onOtpClick,
  }: {
    store: GatingStore;
    onPasswordClick: () => void;
    onXClick: () => void;
    onOtpClick: () => void;
  } = $props();

  const OTP_TYPE = GateType.OTP_EMAIL;

  const options = [
    {
      type: GateType.PASSWORD,
      label: locale.t("links.linkForm.lock.password"),
      enabled: true,
      iconComponent: RectangleEllipsis,
    },
    {
      type: GateType.X_FOLLOWING,
      label: locale.t("links.linkForm.lock.xHandle"),
      enabled: true,
      iconSrc: xIcon,
    },
    {
      type: OTP_TYPE,
      label: locale.t("links.linkForm.lock.otp.oneTimeCodeVerification"),
      enabled: true,
      iconComponent: MessageSquareMore,
    },
    {
      label: locale.t("links.linkForm.lock.telegramGroup"),
      enabled: false,
      iconSrc: telegramIcon,
    },
    {
      label: locale.t("links.linkForm.lock.tokenOrNftOwnership"),
      enabled: false,
      iconSrc: coinTokenIcon,
    },
    {
      label: locale.t("links.linkForm.lock.quizMultipleChoice"),
      enabled: false,
      iconSrc: quizIcon,
    },
  ];

  const isOtpConfigured = $derived(
    store.hasConfiguredOTPEmail || store.hasConfiguredOTPSms,
  );

  function isOptionConfigured(type: GateType | undefined): boolean {
    if (!type) return false;
    if (type === GateType.X_FOLLOWING) return store.hasConfiguredAnyX;
    if (type === OTP_TYPE) return isOtpConfigured;
    return store.selectedGateTypes.includes(type);
  }
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <p class="text-base text-foreground">
      {locale.t("links.linkForm.lock.chooseLocks")}
    </p>

    <button
      type="button"
      class="text-sm text-[#D26060] disabled:opacity-40"
      disabled={!store.hasLocks}
      onclick={() => store.resetAll()}
    >
      {locale.t("links.linkForm.lock.resetAll")}
    </button>
  </div>

  <div class="space-y-2">
    {#each options as option (option.label)}
      <button
        type="button"
        disabled={!option.enabled}
        onclick={() => {
          if (option.type === GateType.PASSWORD) {
            onPasswordClick();
          } else if (option.type === GateType.X_FOLLOWING) {
            onXClick();
          } else if (option.type === OTP_TYPE) {
            onOtpClick();
          }
        }}
        class="flex h-11 w-full items-center gap-3 rounded-lg border border-border bg-background px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 {isOptionConfigured(option.type)
          ? 'border-green'
          : ''}"
      >
        {#if option.iconSrc}
          <img
            src={option.iconSrc}
            alt=""
            class="h-6 w-6 flex-none"
            aria-hidden="true"
          />
        {:else if option.iconComponent}
          <option.iconComponent
            class="h-6 w-6 flex-none text-green"
            aria-hidden="true"
          />
        {/if}
        <span class="text-sm text-foreground">
          {option.label}
        </span>
        {#if isOptionConfigured(option.type)}
          <Lock class="ml-auto h-6 w-6 text-green" aria-hidden="true" />
        {:else if !option.enabled}
          <span class="ml-auto text-xs text-muted-foreground">
            {locale.t("links.linkForm.lock.comingSoon")}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>
