<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import Navbar from "$modules/shared/components/Navbar.svelte";

  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import "../app.css";

  let { children } = $props();
  const queryClient = new QueryClient();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<QueryClientProvider client={queryClient}>
  <!-- DEMO: add a Navbar to all pages -->
  <Navbar />
  {@render children?.()}
</QueryClientProvider>
