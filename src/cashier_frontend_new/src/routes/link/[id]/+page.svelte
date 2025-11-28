<script lang="ts">
  import { page } from "$app/state";
  import Landing from "$modules/useLink/pages/landing.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import { GuardType } from "$modules/guard/types";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";

  const id = page.params.id!;
</script>

<RouteGuard
  guards={[
    { type: GuardType.VALID_LINK },
    { type: GuardType.USER_STATE, allowedStates: [UserLinkStep.LANDING] },
  ]}
  linkId={id}
>
  <Landing linkId={id} />
</RouteGuard>
