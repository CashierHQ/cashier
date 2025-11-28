<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import RouteGuard from "$modules/guard/components/RouteGuard.svelte";
  import { GuardType } from "$modules/guard/types";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { getGuardContext } from "$modules/guard/context.svelte";

  const id = page.params.id;

  let context = $state<ReturnType<typeof getGuardContext> | null>(null);

  onMount(() => {
    context = getGuardContext();

    const handleBack = async () => {
      if (!context) return;
      const createLinkStore = context.linkCreationStore;

      if (!createLinkStore) return;

      if (
        createLinkStore.state.step === LinkStep.CHOOSE_TYPE ||
        createLinkStore.state.step === LinkStep.CREATED
      ) {
        goto(resolve("/links"));
      } else {
        try {
          await createLinkStore.goBack();
        } catch (e) {
          console.error("Failed to go back:", e);
        }
      }
    };

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
        LinkStep.CHOOSE_TYPE,
        LinkStep.ADD_ASSET,
        LinkStep.PREVIEW,
        LinkStep.CREATED,
      ],
    },
  ]}
  tempLinkId={id}
>
  {@const guardContext = getGuardContext()}
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
            {#if guardContext.linkCreationStore}
              <CreateLink linkStore={guardContext.linkCreationStore} />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</RouteGuard>
