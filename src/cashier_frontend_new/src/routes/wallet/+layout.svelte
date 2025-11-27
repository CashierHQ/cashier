<script lang="ts">
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";

  let { children } = $props();
  const context = getRouteGuardContext();
</script>

<RouteGuard guards={[{ type: GuardType.AUTH }]}>
  {#if context.isGuardCheckComplete}
    <NavBar />
    {@render children?.()}
  {/if}
</RouteGuard>
