<!-- DEMO: a layout automatically applied to all pages in this folder and all subfolders -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import Navbar from "$modules/shared/components/Navbar.svelte";
  import ActionDrawer from "$modules/shared/components/ActionDrawer.svelte";
  import { actionDrawerState } from "$modules/shared/state/actionDrawerState.svelte";


  import "../app.css";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<Navbar />
{@render children?.()}

<!-- Global action drawer (mounted once) -->

<ActionDrawer bind:action={actionDrawerState.action} bind:open={actionDrawerState.isOpen} onOpenChange={() => actionDrawerState.close()} />
