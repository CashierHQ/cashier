<script lang="ts">
  import { page } from "$app/state";
  import UseLink from "$modules/useLink/pages/use.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";
  import ProtectedUserState from "$modules/guard/components/ProtectedUserState.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";

  const id = page.params.id!;
</script>

<RouteGuard linkId={id} storeType="userLink">
  <ProtectedAuth redirectTo={`/link/${id}`}>
    <ProtectedValidLink>
      <ProtectedUserState
        allowedStates={[
          UserLinkStep.LANDING,
          UserLinkStep.ADDRESS_UNLOCKED,
          UserLinkStep.ADDRESS_LOCKED,
          UserLinkStep.GATE,
          UserLinkStep.COMPLETED,
        ]}
      >
        <UseLink linkId={id} />
      </ProtectedUserState>
    </ProtectedValidLink>
  </ProtectedAuth>
</RouteGuard>
