<script lang="ts">
  import { toast } from "svelte-sonner";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { locale } from "$lib/i18n";
  import { BUILD_TYPE, II_SIGNER_WALLET_ID } from "$modules/shared/constants";
  import { Info } from "lucide-svelte";
  import type { OpenIdProvider } from "@icp-sdk/auth/client";

  type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called when user presses login (e.g. wallet button). Use for analytics. */
    onBeforeLogin?: () => void;
  };

  let { open, onOpenChange, onBeforeLogin }: Props = $props();

  let isConnecting = $state(false);
  let connectingProvider = $state<OpenIdProvider | null>(null);
  let isLegacyConnecting = $state(false);

  const showLegacyLogin = BUILD_TYPE === "dev" || BUILD_TYPE === "local";

  const openIdLoginOptions: {
    provider: OpenIdProvider;
    labelKey: string;
    iconSrc: string;
    iconAlt: string;
  }[] = [
    {
      provider: "google",
      labelKey: "home.loginModal.signInWithGoogle",
      iconSrc: "/social-icon.svg",
      iconAlt: "Google",
    },
    {
      provider: "apple",
      labelKey: "home.loginModal.signInWithApple",
      iconSrc: "/apple-icon.svg",
      iconAlt: "Apple",
    },
    {
      provider: "microsoft",
      labelKey: "home.loginModal.signInWithMicrosoft",
      iconSrc: "/microsoft-icon.svg",
      iconAlt: "Microsoft",
    },
  ];

  function handleClose() {
    onOpenChange(false);
  }

  async function handleWalletSelect(
    walletId: string,
    openIdProvider?: OpenIdProvider,
  ) {
    if (isConnecting) return;

    onBeforeLogin?.();

    try {
      isConnecting = true;
      connectingProvider = openIdProvider ?? null;
      isLegacyConnecting = !openIdProvider;

      // Map wallet ID to adapter ID
      const adapterId =
        walletId === "internet-identity" ? II_SIGNER_WALLET_ID : walletId;

      // Call login method from authState. redirect handled in authState.login()
      await authState.login(adapterId, { openIdProvider });
      // After successful login,close modal
      handleClose();
      toast.success(locale.t("home.loginModal.successMessage"));
    } catch (error) {
      console.error("Login error:", error);
      toast.error(locale.t("home.loginModal.errorMessage"));
    } finally {
      isConnecting = false;
      connectingProvider = null;
      isLegacyConnecting = false;
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
        {#each openIdLoginOptions as option (option.provider)}
          <button
            type="button"
            onclick={() =>
              handleWalletSelect("internet-identity", option.provider)}
            disabled={isConnecting}
            class="w-full h-10 px-3 border border-[#ebebeb] cursor-pointer rounded-[10px] text-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-start bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="flex items-center w-full text-[14px]">
              <img
                alt={option.iconAlt}
                class="h-6 w-6 mr-[10px]"
                src={option.iconSrc}
              />
              <span class="flex-grow text-left font-medium">
                {#if connectingProvider === option.provider}
                  {locale.t("home.loginModal.connecting")}
                {:else}
                  {locale.t(option.labelKey)}
                {/if}
              </span>
              {#if connectingProvider === option.provider}
                <div
                  class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"
                ></div>
              {/if}
            </span>
          </button>
        {/each}

        {#if showLegacyLogin}
          <button
            type="button"
            onclick={() => handleWalletSelect("internet-identity")}
            disabled={isConnecting}
            class="w-full h-10 px-3 border border-[#ebebeb] cursor-pointer rounded-[10px] text-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-start bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="flex items-center w-full text-[14px]">
              <img
                alt="Internet Identity"
                class="h-6 w-6 mr-[10px]"
                src="/credit-card-check.svg"
              />
              <span class="flex-grow text-left font-medium">
                {#if isLegacyConnecting}
                  {locale.t("home.loginModal.connecting")}
                {:else}
                  {locale.t("home.loginModal.internetIdentity")}
                {/if}
              </span>
              {#if isLegacyConnecting}
                <div
                  class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"
                ></div>
              {/if}
            </span>
          </button>
        {/if}

        <button
          type="button"
          disabled
          class="w-full h-10 px-3 border border-[#ebebeb] cursor-pointer rounded-[10px] text-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center justify-start bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="flex items-center w-full text-[14px]">
            <img
              alt="Other Wallets"
              class="h-6 w-6 mr-[10px]"
              src="/credit-card-check.svg"
            />
            <span class="flex-grow text-left font-medium">
              {locale.t("home.loginModal.otherWallets")}
            </span>
          </span>
        </button>

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
