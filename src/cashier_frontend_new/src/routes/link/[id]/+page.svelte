<script lang="ts">
  import { page } from "$app/state";
  import Landing from "$modules/useLink/pages/landing.svelte";
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";

  const id = page.params.id;
</script>

{#if id}
  <RouteGuard
    guards={[
      { type: GuardType.VALID_LINK },
      { type: GuardType.USER_STATE, allowedStates: [UserLinkStep.LANDING] },
    ]}
    linkId={id}
  >
    {@const context = getRouteGuardContext()}
    {#if context.userLinkStore}
      <Landing userStore={context.userLinkStore} />
    {/if}
  </RouteGuard>
{:else}
  <div>Invalid link ID</div>
{/if}
