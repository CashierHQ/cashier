<script lang="ts">
  import { page } from "$app/state";
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import { GuardType } from "$modules/guard/types";
  import { LinkStep } from "$modules/links/types/linkStep";

  const id = page.params.id!;
</script>

<RouteGuard
  guards={[
    { type: GuardType.AUTH },
    { type: GuardType.VALID_LINK, redirectTo: "/links" },
    { type: GuardType.LINK_OWNER },
    {
      type: GuardType.LINK_STATE,
      allowedStates: [
        LinkStep.CHOOSE_TYPE,
        LinkStep.ADD_ASSET,
        LinkStep.PREVIEW,
        LinkStep.CREATED,
      ],
    },
  ]}
  tempLinkId={id}
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
          <div class="w-full grow-1 flex flex-col">
            <CreateLink tempLinkId={id} />
          </div>
        </div>
      </div>
    </div>
  </div>
</RouteGuard>
