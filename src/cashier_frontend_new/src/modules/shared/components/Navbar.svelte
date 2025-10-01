<!-- Navbar is a global component so it is declared in the global scope in the shared module -->

<script lang="ts">
  import { Button } from "$lib/shadcn/components/ui/button";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { accountState } from "$modules/shared/state/auth.svelte";

  async function handleLogin(walletId: string) {
    try {
      await authState.login(walletId);
    } catch (error) {
      console.error("Login error:", error);
    }
  }

  async function handleLogout() {
    try {
      await authState.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
</script>

<div class="navbar bg-base-100 shadow-sm">
  <div class="flex-1">
    <div class="btn btn-ghost text-xl">Cashier</div>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      {#if authState.isConnecting}
        <li><div class="loading loading-spinner loading-sm"></div></li>
        <li><span>Reconnecting...</span></li>
      {:else if accountState.account}
        <li><div>Welcome [{accountState.account.owner}]</div></li>
        <li><Button onclick={handleLogout}>Logout</Button></li>
      {:else}
        <li>
          <Button onclick={() => handleLogin("ii")}>Login II</Button>
        </li>
      {/if}
    </ul>
  </div>
</div>
