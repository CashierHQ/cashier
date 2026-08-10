<script lang="ts">
  import { env } from "$env/dynamic/public";

  const fixtureEnabled = env.PUBLIC_E2E_AUTH_FIXTURE === "true";

  function completeAuthentication() {
    window.opener?.postMessage(
      { type: "cashier-e2e-authenticated" },
      window.location.origin,
    );
    // Allow the browser automation click to settle before the tab disappears.
    window.setTimeout(() => window.close(), 50);
  }
</script>

{#if fixtureEnabled}
  <main>
    <h1>Authentication provider</h1>
    <button type="button" onclick={completeAuthentication}>
      Complete authentication
    </button>
  </main>
{:else}
  <h1>Page not found</h1>
{/if}
