<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import RouteGuard from "$modules/shared/components/guards/RouteGuard.svelte";
  import { GuardType } from "$modules/shared/components/guards/types";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";

  const id = page.params.id;

  async function handleBack() {
    const context = getRouteGuardContext();
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
  }

  onMount(() => {
    appHeaderStore.setBackHandler(handleBack);

    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

<div class="w-full grow-1 flex flex-col">
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
    {@const context = getRouteGuardContext()}
    {#if context.linkCreationStore}
      <CreateLink linkStore={context.linkCreationStore} />
    {/if}
  </RouteGuard>
</div>
