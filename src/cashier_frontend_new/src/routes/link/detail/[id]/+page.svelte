<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import DetailLink from "$modules/detailLink/pages/detail.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import ProtectedAuth from "$modules/guard/components/ProtectedAuth.svelte";
  import ProtectedValidLink from "$modules/guard/components/ProtectedValidLink.svelte";
  import ProtectedLinkOwner from "$modules/guard/components/ProtectedLinkOwner.svelte";
  import ProtectedLinkState from "$modules/guard/components/ProtectedLinkState.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { onMount } from "svelte";

  const id = page.params.id!;

  const handleBack = async () => {
    goto(resolve("/links"));
  };

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);

    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

<RouteGuard linkId={id} storeType="linkDetail">
  <ProtectedAuth>
    <ProtectedValidLink redirectTo="/links">
      <ProtectedLinkOwner>
        <ProtectedLinkState
          allowedStates={[
            LinkStep.CREATED,
            LinkStep.ACTIVE,
            LinkStep.INACTIVE,
            LinkStep.ENDED,
          ]}
        >
          <div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
            <AppHeader isCreateOrEditPage={true} />

            <div
              class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col"
            >
              <div
                class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-4 grow-1 bg-white sm:rounded-xl flex flex-col h-full"
              >
                <div
                  class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-86px)] overflow-y-auto scrollbar-hide flex flex-col grow-1"
                >
                  <DetailLink {id} onBack={handleBack} />
                </div>
              </div>
            </div>
          </div>
        </ProtectedLinkState>
      </ProtectedLinkOwner>
    </ProtectedValidLink>
  </ProtectedAuth>
</RouteGuard>
