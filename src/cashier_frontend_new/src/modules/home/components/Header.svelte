<script lang="ts">
  import { Button } from "$lib/shadcn/components/ui/button";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { resolve } from "$app/paths";

  type Props = {
    onLoginClick?: () => void;
  };

  let { onLoginClick }: Props = $props();

  async function handleLogin(walletId: string): Promise<void> {
    try {
      await authState.login(walletId);
    } catch (error) {
      console.error("Login error:", error);
    }
  }

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
      <a href={resolve("/")}>
        <img
          alt="Cashier logo"
          class="max-w-[130px] cursor-pointer"
          src="/logo.svg"
        />
      </a>
      {#if authState.isConnecting}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <div
            class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
          ></div>
          <span>Reconnecting...</span>
        </div>
      {:else if authState.account}
        <div class="flex items-center gap-4">
          <span class="text-sm text-muted-foreground">
            Welcome <span class="text-foreground font-medium"
              >{authState.account.owner}</span
            >
          </span>
          <Button onclick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      {:else}
        <button
          id="connect"
          onclick={handleLoginClick}
          class="h-[45px] font-medium bg-transparent border border-[#e5e5e5] cursor-pointer text-primary !font-bold hover:bg-primary/90 hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-300 rounded-lg px-[15px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Login
        </button>
      {/if}
    </div>
  </div>
</header>
