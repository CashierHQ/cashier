<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->

<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/modules/shared/components/Navbar.svelte';
	import { TokenPriceService } from '$lib/modules/shared/services/tokenPrice.svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setContext } from 'svelte';
	import '../app.css';
	
	let { children } = $props();
  const queryClient = new QueryClient();

  const tokenPriceService = new TokenPriceService();
  setContext('tokenPriceService', tokenPriceService);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryClientProvider client={queryClient}>
  <!-- DEMO: add a Navbar to all pages -->
  <Navbar />
  {@render children?.()}
</QueryClientProvider>