<script lang="ts">
  import { authState } from "$modules/auth/state/auth.svelte";
  import { onDestroy } from "svelte";

  let { children } = $props();

  // Cleanup handlers when component unmounts
  onDestroy(() => {
    authState.resetOnLogoutHandler();
    authState.resetOnLoginHandler();
  });
</script>

<div class="w-full mx-auto mt-4">
  {@render children?.()}
</div>
