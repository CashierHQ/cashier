<script lang="ts">
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/types/guards";
  import NavBar from "$modules/token/components/navBar.svelte";

  let { children } = $props();
</script>

<RouteGuard guards={[{ type: GuardType.AUTH }]}>
  <NavBar />
  {@render children?.()}
</RouteGuard>
