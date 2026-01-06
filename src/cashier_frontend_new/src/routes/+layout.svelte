<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import { initLocale } from "$lib/i18n";
  import { Toaster } from "$lib/shadcn/components/ui/sonner";
  import ProtectedIP from "$modules/guard/components/ProtectedIP.svelte";
  import "../app.css";

  let { children } = $props();

  // Initialize i18n on mount
  initLocale();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ProtectedIP>
  {@render children?.()}
</ProtectedIP>

<Toaster />
