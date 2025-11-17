<script lang="ts">
  import Protected from "$modules/shared/components/Protected.svelte";
  import NavBar from "../../../../../token/components/navBar.svelte";
  let { children } = $props();
</script>

<Protected>
  <NavBar />
  {@render children?.()}
</Protected>
