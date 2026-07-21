<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { initLocale } from "$lib/i18n";
  import { Toaster } from "$lib/shadcn/components/ui/sonner";
  import ProtectedIP from "$modules/routing/components/ProtectedIP.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import DebugSessionTimers from "$modules/auth/components/DebugSessionTimers.svelte";
  import { refreshAmplitudeUserIdFromAuth } from "$modules/analytics/amplitudeStore";
  import "../app.css";

  let { children } = $props();

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

<ProtectedIP>
  {@render children?.()}
</ProtectedIP>

<DebugSessionTimers />
<Toaster />
