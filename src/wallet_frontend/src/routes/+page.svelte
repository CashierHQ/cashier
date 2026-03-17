<script lang="ts">
  import { authState } from "$modules/auth/auth-state.svelte";

  let loginError = $state<string | null>(null);

  async function handleLogin() {
    loginError = null;
    try {
      await authState.login();
    } catch (err) {
      loginError = err instanceof Error ? err.message : "Login failed";
    }
  }
</script>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
  <h1 class="text-3xl font-bold">Wallet</h1>

  {#if !authState.isReady}
    <p>Loading...</p>
  {:else if authState.isLoggedIn}
    <p class="text-sm text-gray-600">Principal: {authState.principal}</p>
    <button
      class="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      onclick={() => authState.logout()}
    >
      Logout
    </button>
  {:else}
    <button
      class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
      onclick={handleLogin}
      disabled={authState.isConnecting}
    >
      {authState.isConnecting ? "Connecting..." : "Login with Internet Identity"}
    </button>
    {#if loginError}
      <p class="text-sm text-red-500">{loginError}</p>
    {/if}
  {/if}
</main>
