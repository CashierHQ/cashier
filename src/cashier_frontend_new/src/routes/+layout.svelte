<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { initLocale } from "$lib/i18n";
  import { Toaster } from "$lib/shadcn/components/ui/sonner";
  import ProtectedIP from "$modules/guard/components/ProtectedIP.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { refreshAmplitudeUserIdFromAuth } from "$modules/analytics/amplitudeStore";
  import { isE2ERedirectEnabled } from "$modules/routing/e2eRedirectInput";
  import { page } from "$app/state";
  import "../app.css";

  let { children } = $props();
  const skipIpProtection = $derived(isE2ERedirectEnabled(page.url));

  // Initialize i18n on mount
  initLocale();

  // Sync Amplitude userId whenever auth state changes (login/logout)
  $effect(() => {
    void authState.account?.owner; // Subscribe to auth changes for reactivity
    refreshAmplitudeUserIdFromAuth();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if skipIpProtection}
  {@render children?.()}
{:else}
  <ProtectedIP>
    {@render children?.()}
  </ProtectedIP>
{/if}

<Toaster />
