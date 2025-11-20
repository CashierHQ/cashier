<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { locale } from "$lib/i18n";

  const { id }: { id: string } = $props();
  let isLoading = $state(true);
  let newLink = $state<LinkCreationStore | null>(null);

  async function handleBack() {
    if (!newLink) return;

    if (
      newLink.state.step === LinkStep.CHOOSE_TYPE ||
      newLink.state.step === LinkStep.CREATED
    ) {
      goto(resolve("/links"));
    } else {
      try {
        await newLink.goBack();
      } catch (e) {
        console.error("Failed to go back:", e);
      }
    }
  }

  onMount(() => {
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

    newLink = new LinkCreationStore(tempLink);
    appHeaderStore.setBackHandler(handleBack);
    updateHeaderName();
    isLoading = false;

    // Cleanup back handler on unmount
    return () => {
      appHeaderStore.clearBackHandler();
      appHeaderStore.clearHeaderName();
    };
  });

  // Update header name based on current step
  function updateHeaderName() {
    if (!newLink) return;

    const step = newLink.state.step;
    if (step === LinkStep.ADD_ASSET) {
      appHeaderStore.setHeaderName(locale.t("links.linkForm.header.addAssets"));
    } else if (step === LinkStep.CHOOSE_TYPE) {
      appHeaderStore.setHeaderName(
        newLink.createLinkData.title.trim() ||
          locale.t("links.linkForm.header.linkName"),
      );
    } else {
      appHeaderStore.setHeaderName(
        newLink.createLinkData.title.trim() ||
          locale.t("links.linkForm.header.linkName"),
      );
    }
  }

  // Watch for step changes and update header name
  $effect(() => {
    if (newLink) {
      const step = newLink.state.step;
      if (step === LinkStep.ADD_ASSET) {
        appHeaderStore.setHeaderName(
          locale.t("links.linkForm.header.addAssets"),
        );
      } else if (step === LinkStep.CHOOSE_TYPE) {
        appHeaderStore.setHeaderName(
          newLink.createLinkData.title.trim() ||
            locale.t("links.linkForm.header.linkName"),
        );
      } else {
        appHeaderStore.setHeaderName(
          newLink.createLinkData.title.trim() ||
            locale.t("links.linkForm.header.linkName"),
        );
      }
    }
  });
</script>

{#if isLoading}
  <div>Loading...</div>
{:else if !newLink}
  <div>Link not found</div>
{:else}
  <div class="grow-1 flex flex-col mt-2 sm:mt-0">
    <CreateLinkHeader link={newLink} />
    {#if newLink.state.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={newLink} />
    {:else if newLink.state.step === LinkStep.ADD_ASSET}
      <AddAsset link={newLink} />
    {:else if newLink.state.step === LinkStep.PREVIEW}
      <Preview link={newLink} />
    {:else if newLink.state.step === LinkStep.CREATED}
      <CreatedLink link={newLink} />
    {/if}
  </div>
{/if}
