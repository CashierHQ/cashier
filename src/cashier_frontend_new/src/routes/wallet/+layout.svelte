<script lang="ts">
  import NavBar from "$modules/token/components/navBar.svelte";

  let { children } = $props();
</script>

<NavBar />
{@render children?.()}
