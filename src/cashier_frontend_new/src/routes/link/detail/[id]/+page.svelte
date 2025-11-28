<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import DetailLink from "$modules/detailLink/pages/detail.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import { GuardType } from "$modules/guard/types";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { onMount } from "svelte";

  const id = page.params.id;

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

<RouteGuard
  guards={[
    { type: GuardType.AUTH },
    { type: GuardType.VALID_LINK, redirectTo: "/links" },
    { type: GuardType.LINK_OWNER },
    {
      type: GuardType.LINK_STATE,
      allowedStates: [
        LinkStep.CREATED,
        LinkStep.ACTIVE,
        LinkStep.INACTIVE,
        LinkStep.ENDED,
      ],
    },
  ]}
  linkId={id}
>
  <div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
    <AppHeader isCreateOrEditPage={true} />

    <div class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col">
      <div
        class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-4 grow-1 bg-white sm:rounded-xl flex flex-col h-full"
      >
        <div
          class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-86px)] overflow-y-auto scrollbar-hide flex flex-col grow-1"
        >
          <DetailLink {id} />
        </div>
      </div>
    </div>
  </div>
</RouteGuard>
