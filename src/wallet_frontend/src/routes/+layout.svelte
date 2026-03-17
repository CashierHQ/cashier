<script lang="ts">
  import "../app.css";
  // Import to trigger auth init on app load
  import "$modules/auth/auth-state.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <title>Wallet</title>
</svelte:head>

{@render children?.()}
