<script lang="ts">
  import { page } from "$app/state";
  import UseLink from "$modules/useLink/pages/use.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import { GuardType } from "$modules/guard/types";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";
  import { getGuardContext } from "$modules/guard/context.svelte";

  const id = page.params.id;
</script>

<RouteGuard
  guards={[
    { type: GuardType.AUTH, redirectTo: `/link/${id}` },
    { type: GuardType.VALID_LINK },
    {
      type: GuardType.USER_STATE,
      allowedStates: [
        UserLinkStep.LANDING,
        UserLinkStep.ADDRESS_UNLOCKED,
        UserLinkStep.ADDRESS_LOCKED,
        UserLinkStep.GATE,
        UserLinkStep.COMPLETED,
      ],
    },
  ]}
  linkId={id}
>
  {@const context = getGuardContext()}
  {#if context.userLinkStore}
    <UseLink userStore={context.userLinkStore} />
  {/if}
</RouteGuard>
