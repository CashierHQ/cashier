<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { onDestroy } from "svelte";

  let { children } = $props();

  const id = page.params.id;
  const landingUrl = resolve(`/link/${id}`);
  const useUrl = resolve(`/link/${id}/use`);
  const isLandingPage = $derived(page.url.pathname === landingUrl);

  $effect(() => {
    if (authState.isReady && authState.isLoggedIn && isLandingPage) {
      goto(useUrl);
    }
  });

  authState.setOnLogout(() => {
    if (page.url.pathname === useUrl) {
      goto(landingUrl);
    }
  });

  authState.setOnLogin(() => {
    if (isLandingPage) {
      goto(useUrl);
    }
  });

  onDestroy(() => {
    authState.resetOnLogoutHandler();
    authState.resetOnLoginHandler();
  });
</script>

<div class="w-full mx-auto">
  {@render children?.()}
</div>
