<script lang="ts">
  import { page } from "$app/state";
  import UseLink from "$modules/useLink/pages/use.svelte";
  import PageLayout from "$modules/shared/components/PageLayout.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";
  import ProtectedUserState from "$modules/guard/components/ProtectedUserState.svelte";
  import { UserLinkStep } from "$modules/links/types/userLinkStep";

  const id = page.params.id!;

  // Track isLink state - false for ADDRESS_UNLOCKED step
  let isLink = $state(true);
  let showFooter = $state(false);

  const handleIsLinkChange = (newIsLink: boolean) => {
    isLink = newIsLink;
  };

  const handleShowFooterChange = (newShowFooter: boolean) => {
    showFooter = newShowFooter;
  };
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
        <PageLayout isCreateOrEditPage={true} {isLink} {showFooter}>
          <UseLink
            onIsLinkChange={handleIsLinkChange}
            onShowFooterChange={handleShowFooterChange}
          />
        </PageLayout>
      </ProtectedUserState>
    </ProtectedValidLink>
  </ProtectedAuth>
</RouteGuard>
