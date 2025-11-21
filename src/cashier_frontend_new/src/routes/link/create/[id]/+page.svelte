<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import CreationFlowProtected from "$modules/creationLink/components/creationFlowProtected.svelte";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";

  const id = page.params.id;
  let isLoading = $state(true);
  let createLinkStore = $state<LinkCreationStore | null>(null);

  async function handleBack() {
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
    if (!id) {
      goto(resolve("/links"));
      return;
    }

    const getTempLinkRes = LinkCreationStore.getTempLink(id);

    if (getTempLinkRes.isErr()) {
      goto(resolve("/links"));
      return;
    }

    const tempLink = getTempLinkRes.unwrap();

    if (!tempLink) {
      goto(resolve("/links"));
      return;
    }

    createLinkStore = new LinkCreationStore(tempLink);
    appHeaderStore.setBackHandler(handleBack);
    isLoading = false;

    // Cleanup back handler on unmount
    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

{#if !id}
  <div class="grow-1 flex flex-col">Invalid link ID</div>
{:else if isLoading}
  <div class="w-full grow-1 flex flex-col">
    <div>Loading...</div>
  </div>
{:else if !createLinkStore}
  <div class="w-full grow-1 flex flex-col">
    <div>Link not found</div>
  </div>
{:else}
  <div class="w-full grow-1 flex flex-col">
    <CreationFlowProtected linkStore={createLinkStore}>
      <CreateLink linkStore={createLinkStore} />
    </CreationFlowProtected>
  </div>
{/if}
