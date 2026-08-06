<script lang="ts">
  import { toast } from "svelte-sonner";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { locale } from "$lib/i18n";
  import { Info } from "lucide-svelte";
  import type { AuthProvider } from "$modules/auth/types";
  import {
    GOOGLE_LOGIN_OPTION,
    INTERNET_IDENTITY_LOGIN_OPTION,
    SECONDARY_OPEN_ID_LOGIN_OPTIONS,
  } from "$modules/home/constants";

  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called when user presses login (e.g. wallet button). Use for analytics. */
    onBeforeLogin?: () => void;
  };

  let { open, onOpenChange, onBeforeLogin }: Props = $props();

  let activeProvider = $state<AuthProvider | null>(null);
  let isConnecting = $derived(activeProvider !== null);

  function handleClose() {
    onOpenChange(false);
  }

  async function handleProviderSelect(provider: AuthProvider) {
    if (isConnecting) return;

    onBeforeLogin?.();

    try {
      activeProvider = provider;
      const result = await authState.login(provider);
      if (result.status === "cancelled") return;

      handleClose();
      toast.success(locale.t("home.loginModal.successMessage"));
    } catch (error) {
      console.error("Login error:", error);
      toast.error(locale.t("home.loginModal.errorMessage"));
    } finally {
      activeProvider = null;
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isConnecting) {
      handleClose();
    }
  }
</script>

{#if open}
  <!-- Overlay -->
  <div
    class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    onclick={handleOverlayClick}
    role="presentation"
  ></div>

  <!-- Dialog -->
  <div
    role="dialog"
    aria-describedby="login-dialog-description"
    aria-labelledby="login-dialog-title"
    data-state={open ? "open" : "closed"}
    class="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-12px)] !max-w-[343px] translate-x-[-50%] translate-y-[-50%] gap-6 border bg-background p-5 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-3xl sm:w-full sm:max-w-sm border-none shadow-2xl overflow-hidden"
    tabindex="-1"
  >
    <div class="flex flex-col space-y-1.5 text-center sm:text-left">
      <h2
        id="login-dialog-title"
        class="text-lg font-semibold leading-[30px] tracking-tight"
      >
        {locale.t("home.loginModal.title")}
      </h2>
    </div>

    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <button
          type="button"
          onclick={() => handleProviderSelect(GOOGLE_LOGIN_OPTION.provider)}
          disabled={isConnecting}
          class="w-full h-12 overflow-hidden border border-[#ebebeb] cursor-pointer rounded-[10px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-stretch bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span
            class="flex size-12 shrink-0 items-center justify-center border-r border-[#ebebeb] bg-background"
          >
            <img
              alt=""
              aria-hidden="true"
              class="h-6 w-6"
              src={GOOGLE_LOGIN_OPTION.iconSrc}
            />
          </span>
          <span
            class="flex flex-1 items-center gap-2 px-5 text-[14px] whitespace-nowrap"
          >
            <span class="font-semibold">
              {#if activeProvider === GOOGLE_LOGIN_OPTION.provider}
                {locale.t("home.loginModal.connecting")}
              {:else}
                {locale.t(GOOGLE_LOGIN_OPTION.labelKey)}
              {/if}
            </span>
            {#if activeProvider === GOOGLE_LOGIN_OPTION.provider}
              <div
                class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            {/if}
          </span>
        </button>

        <div class="flex w-full gap-2">
          {#each SECONDARY_OPEN_ID_LOGIN_OPTIONS as option (option.provider)}
            <button
              type="button"
              onclick={() => handleProviderSelect(option.provider)}
              disabled={isConnecting}
              aria-label={locale.t(option.labelKey)}
              title={locale.t(option.labelKey)}
              class="h-12 flex-1 border border-[#ebebeb] cursor-pointer rounded-[10px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if activeProvider === option.provider}
                <div
                  class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
                ></div>
              {:else}
                <img
                  alt=""
                  aria-hidden="true"
                  class="h-6 w-6"
                  src={option.iconSrc}
                />
              {/if}
            </button>
          {/each}

          <button
            type="button"
            onclick={() =>
              handleProviderSelect(INTERNET_IDENTITY_LOGIN_OPTION.provider)}
            disabled={isConnecting}
            aria-label={locale.t(INTERNET_IDENTITY_LOGIN_OPTION.labelKey)}
            title={locale.t(INTERNET_IDENTITY_LOGIN_OPTION.labelKey)}
            class="h-12 flex-1 border border-[#ebebeb] cursor-pointer rounded-[10px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-center bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if activeProvider === INTERNET_IDENTITY_LOGIN_OPTION.provider}
              <div
                class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
              ></div>
            {:else}
              <img
                alt=""
                aria-hidden="true"
                class="h-5 w-8"
                src={INTERNET_IDENTITY_LOGIN_OPTION.iconSrc}
              />
            {/if}
          </button>
        </div>

        <div class="flex gap-1.5 mt-6">
          <div class="w-5 h-5 min-w-5 flex items-center justify-center">
            <Info size={14} class="text-primary" />
          </div>
          <p class="text-xs text-grey-800 italic leading-[16px]">
            {locale.t("home.loginModal.regionDisclaimer")}
          </p>
        </div>
      </div>
    </div>

    <button
      type="button"
      onclick={handleClose}
      disabled={isConnecting}
      class="absolute right-2.5 top-3.75 w-10 h-10 place-items-center place-content-center cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground disabled:opacity-50"
    >
      <img src="/x.svg" class="w-6 h-6" alt="Close" />
      <span class="sr-only">Close</span>
    </button>
  </div>
{/if}
