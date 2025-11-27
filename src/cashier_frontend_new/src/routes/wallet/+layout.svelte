<script lang="ts">
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";

  let { children } = $props();
</script>

<RouteGuard guards={[{ type: GuardType.AUTH }]}>
  {@const context = getRouteGuardContext()}
  {#if context.isGuardCheckComplete}
    <NavBar />
    {@render children?.()}
  {/if}
</RouteGuard>
