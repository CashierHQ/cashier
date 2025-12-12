<script lang="ts">
  import { Button } from "$lib/shadcn/components/ui/button";
  import CashierLogo from "$modules/ui/components/CashierLogo.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";

  type Props = {
    onLoginClick?: () => void;
  };

  let { onLoginClick }: Props = $props();

  async function handleLogout(): Promise<void> {
    try {
      await authState.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  function handleLoginClick(): void {
    onLoginClick?.();
  }
</script>

<header class="w-full bg-background lg:mt-1 my-0.5">
  <div class="mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div class="flex justify-between items-center">
      <!-- Logo -->
      <CashierLogo href={resolve("/")} />
      {#if authState.account}
        <div class="flex items-center gap-4">
          <span class="text-sm text-muted-foreground">
            {locale.t("home.header.welcome")}
            <span class="text-foreground font-medium"
              >{authState.account.owner}</span
            >
          </span>
          <Button onclick={handleLogout} variant="outline" size="sm">
            {locale.t("home.header.logout")}
          </Button>
        </div>
      {:else}
        <button
          id="connect"
          onclick={handleLoginClick}
          class="h-[45px] font-medium bg-transparent border border-[#e5e5e5] cursor-pointer text-primary !font-bold hover:bg-primary/90 hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-300 rounded-lg px-[15px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {locale.t("home.header.login")}
        </button>
      {/if}
    </div>
  </div>
</header>
