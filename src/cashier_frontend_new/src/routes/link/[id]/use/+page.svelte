<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import UseLink from "$modules/useLink/pages/use.svelte";
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";

  const id = page.params.id;
</script>

<RouteGuard
  guards={[
    { type: GuardType.AUTH, redirectTo: resolve(`/link/${id}`) },
    { type: GuardType.VALID_LINK },
    {
      type: GuardType.USER_STATE,
      allowedStates: [
        UserLinkStep.ADDRESS_UNLOCKED,
        UserLinkStep.ADDRESS_LOCKED,
        UserLinkStep.GATE,
        UserLinkStep.COMPLETED,
      ],
    },
  ]}
  linkId={id}
>
  {@const context = getRouteGuardContext()}
  {#if context.userLinkStore}
    <UseLink userStore={context.userLinkStore} />
  {/if}
</RouteGuard>
