<script lang="ts">
  import { locale } from "$lib/i18n";
  import { GATE_OPTIONS, OTP_TYPE } from "$modules/gating/constants";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { GateType } from "$modules/gating/types/gate";
  import { Lock } from "lucide-svelte";
  import { SvelteMap } from "svelte/reactivity";

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

  const isOtpConfigured = $derived(
    store.hasConfiguredOTPEmail || store.hasConfiguredOTPSms,
  );

  const isOptionConfigured = $derived.by(() => {
    const configured = new SvelteMap<GateType, boolean>();
    for (const option of GATE_OPTIONS) {
      if (!option.type) continue;
      if (option.type === GateType.X_FOLLOWING) {
        configured.set(option.type, store.hasConfiguredAnyX);
      } else if (option.type === OTP_TYPE) {
        configured.set(option.type, isOtpConfigured);
      } else {
        configured.set(
          option.type,
          store.selectedGateTypes.includes(option.type),
        );
      }
    }
    return configured;
  });
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
    {#each GATE_OPTIONS as option (option.label)}
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
        class="flex h-11 w-full items-center gap-3 rounded-lg border border-border bg-background px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 {option.type &&
        isOptionConfigured.get(option.type)
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
        {#if option.type && isOptionConfigured.get(option.type)}
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
