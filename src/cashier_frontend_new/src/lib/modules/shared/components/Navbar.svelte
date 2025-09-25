<!-- Navbar is a global component so it is declared in the global scope in the shared module -->

<script lang="ts">
  import { authState } from "$modules/auth/state/auth.svelte";
  import { Button } from "$lib/shadcn/components/ui/button";

  let isReconnecting = $state(false);

  // DEMO: effect is a reactive function, it does not require to declare which variables it depends on
  $effect(() => {
    console.log("Auth state changed: ", authState.account);
  });

  // Auto-reconnect effect - runs when connectedWalletId changes
  $effect(() => {
    if (authState.connectedWalletId && !authState.account && !isReconnecting) {
      console.log(
        "Found stored wallet ID, attempting to reconnect:",
        authState.connectedWalletId,
      );
      isReconnecting = true;

      authState
        .reconnect()
        .then(() => {
          console.log("Auto-reconnect successful");
        })
        .catch((error) => {
          console.error("Auto-reconnect failed:", error);
        })
        .finally(() => {
          isReconnecting = false;
        });
    }
  });

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
      {#if isReconnecting}
        <li><div class="loading loading-spinner loading-sm"></div></li>
        <li><span>Reconnecting...</span></li>
      {:else if authState.account}
        <li><div>Welcome [{authState.account.owner}]</div></li>
        <li><Button onclick={handleLogout}>Logout</Button></li>
      {:else}
        <li>
          <Button onclick={() => handleLogin("iiSigner")}>Login II</Button>
        </li>
      {/if}
    </ul>
  </div>
</div>
