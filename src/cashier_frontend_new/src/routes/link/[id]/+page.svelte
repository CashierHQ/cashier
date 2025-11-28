<script lang="ts">
  import { page } from "$app/state";
  import Landing from "$modules/useLink/pages/landing.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";
  import ProtectedUserState from "$modules/guard/components/ProtectedUserState.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";

  const id = page.params.id!;
</script>

<RouteGuard linkId={id} storeType="userLink">
  <ProtectedValidLink>
    <ProtectedUserState allowedStates={[UserLinkStep.LANDING]}>
      <Landing linkId={id} />
    </ProtectedUserState>
  </ProtectedValidLink>
</RouteGuard>
