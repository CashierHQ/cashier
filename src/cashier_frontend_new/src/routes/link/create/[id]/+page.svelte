<script lang="ts">
  import { page } from "$app/state";
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import PageLayout from "$modules/shared/components/PageLayout.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";
  import ProtectedLinkOwner from "$modules/guard/components/ProtectedLinkOwner.svelte";
  import ProtectedLinkState from "$modules/guard/components/ProtectedLinkState.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";

  const id = page.params.id!;
</script>

<RouteGuard tempLinkId={id}>
  <ProtectedAuth>
    <ProtectedValidLink redirectTo="/links">
      <ProtectedLinkOwner>
        <ProtectedLinkState
          allowedStates={[
            LinkStep.CHOOSE_TYPE,
            LinkStep.ADD_ASSET,
            LinkStep.PREVIEW,
            LinkStep.CREATED,
          ]}
        >
          <PageLayout isCreateOrEditPage={true}>
            <div class="w-full grow-1 flex flex-col">
              <CreateLink tempLinkId={id} />
            </div>
          </PageLayout>
        </ProtectedLinkState>
      </ProtectedLinkOwner>
    </ProtectedValidLink>
  </ProtectedAuth>
</RouteGuard>
