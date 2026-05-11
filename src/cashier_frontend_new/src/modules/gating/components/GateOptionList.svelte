<script lang="ts">
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { GateType } from "$modules/gating/types/gate";
  import xIcon from "$lib/assets/x-icon.svg";
  import telegramIcon from "$lib/assets/telegram-icon.svg";
  import quizIcon from "$lib/assets/gating/quiz-icon.svg";
  import coinTokenIcon from "$lib/assets/gating/coin-token-icon.svg";
  import { LockKeyhole, RectangleEllipsis } from "lucide-svelte";

  const {
    store,
    onPasswordClick,
  }: {
    store: GatingStore;
    onPasswordClick: () => void;
  } = $props();

  const options = [
    {
      type: GateType.PASSWORD,
      label: "Password",
      enabled: true,
      iconComponent: RectangleEllipsis,
    },
    {
      label: "X handle",
      enabled: false,
      iconSrc: xIcon,
    },
    {
      label: "Telegram group",
      enabled: false,
      iconSrc: telegramIcon,
    },
    {
      label: "Token or NFT ownership",
      enabled: false,
      iconSrc: coinTokenIcon,
    },
    {
      label: "Quiz: multiple choice",
      enabled: false,
      iconSrc: quizIcon,
    },
  ];
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <p class="text-base text-foreground">Choose locks</p>

    <button
      type="button"
      class="text-sm text-[#D26060] disabled:opacity-40"
      disabled={!store.hasLocks}
      onclick={() => store.resetAll()}
    >
      Reset all
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
          }
        }}
        class="flex h-11 w-full items-center gap-3 rounded-lg border border-border bg-background px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 {option.type &&
        store.selectedGateTypes.includes(option.type)
          ? 'border-green bg-green/5'
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
        {#if option.type === GateType.PASSWORD && store.hasConfiguredPassword}
          <LockKeyhole class="ml-auto h-4 w-4 text-green" aria-hidden="true" />
        {:else if !option.enabled}
          <span class="ml-auto text-xs text-muted-foreground">
            Coming soon
          </span>
        {/if}
      </button>
    {/each}
  </div>
</div>
