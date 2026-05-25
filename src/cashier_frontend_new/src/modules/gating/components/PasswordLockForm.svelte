<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { Eye, EyeOff } from "lucide-svelte";

  const {
    store,
    onLock,
  }: {
    store: GatingStore;
    onLock: () => void;
  } = $props();

  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let submitted = $state(false);

  const handleLock = () => {
    submitted = true;
    if (store.passwordSetupError) return;

    store.savePasswordLock();
    onLock();
  };
</script>

<div class="space-y-5">
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label for="gate-password" class="text-sm font-medium text-foreground">
        {locale.t("links.linkForm.lock.keyPassword")}
      </label>

      <button
        type="button"
        class="text-xs font-medium text-[#D26060]"
        onclick={() => {
          submitted = false;
          store.clearPasswordDraft();
        }}
      >
        {locale.t("links.linkForm.lock.reset")}
      </button>
    </div>

    <div class="relative">
      <input
        id="gate-password"
        type={showPassword ? "text" : "password"}
        value={store.password}
        oninput={(e) =>
          store.setPassword((e.currentTarget as HTMLInputElement).value)}
        placeholder={locale.t("links.linkForm.lock.enterPassword")}
        class="h-11 w-full rounded-lg border border-border bg-background px-4 pr-11 text-sm outline-none focus:border-green"
      />

      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword
          ? locale.t("links.linkForm.lock.hidePassword")
          : locale.t("links.linkForm.lock.showPassword")}
      >
        {#if showPassword}
          <EyeOff class="h-5 w-5" />
        {:else}
          <Eye class="h-5 w-5" />
        {/if}
      </button>
    </div>
  </div>

  <div class="space-y-2">
    <label
      for="gate-confirm-password"
      class="text-sm font-medium text-foreground"
    >
      {locale.t("links.linkForm.lock.confirmPassword")}
    </label>

    <div class="relative">
      <input
        id="gate-confirm-password"
        type={showConfirmPassword ? "text" : "password"}
        value={store.confirmPassword}
        oninput={(e) =>
          store.setConfirmPassword((e.currentTarget as HTMLInputElement).value)}
        placeholder={locale.t("links.linkForm.lock.enterPassword")}
        class="h-11 w-full rounded-lg border border-border bg-background px-4 pr-11 text-sm outline-none focus:border-green {submitted &&
        store.passwordSetupError
          ? 'border-[#D26060]'
          : ''}"
      />

      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        onclick={() => (showConfirmPassword = !showConfirmPassword)}
        aria-label={showConfirmPassword
          ? locale.t("links.linkForm.lock.hidePassword")
          : locale.t("links.linkForm.lock.showPassword")}
      >
        {#if showConfirmPassword}
          <EyeOff class="h-5 w-5" />
        {:else}
          <Eye class="h-5 w-5" />
        {/if}
      </button>
    </div>

    {#if submitted && store.passwordSetupError}
      <p class="text-xs text-[#D26060]">{store.passwordSetupError}</p>
    {/if}
  </div>

  <Button
    type="button"
    onclick={handleLock}
    class="h-12 w-full rounded-full bg-green text-primary-foreground hover:bg-green/90"
  >
    {locale.t("links.linkForm.lock.lock")}
  </Button>
</div>
