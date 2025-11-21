<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import AddAsset from "../components/addAsset.svelte";
  import ChooseLinkType from "../components/chooseLinkType.svelte";
  import CreatedLink from "../components/createdLink.svelte";
  import CreateLinkHeader from "../components/createLinkHeader.svelte";
  import Preview from "../components/preview.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { locale } from "$lib/i18n";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";

  const { linkStore }: { linkStore: LinkCreationStore } = $props();

  const handleBack = async () => {
    const backHandler = appHeaderStore.getBackHandler();
    if (backHandler) {
      await backHandler();
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
    switch (step) {
      case LinkStep.ADD_ASSET:
        appHeaderStore.setHeaderName(
          locale.t("links.linkForm.header.addAssets"),
        );
        break;
      case LinkStep.CHOOSE_TYPE:
      default:
        appHeaderStore.setHeaderName(
          newLink.createLinkData.title.trim() ||
            locale.t("links.linkForm.header.linkName"),
        );
        break;
    }
  }

  // Watch for step changes and update header name
  $effect(() => {
    if (newLink) {
      const step = newLink.state.step;
      switch (step) {
        case LinkStep.ADD_ASSET:
          appHeaderStore.setHeaderName(
            locale.t("links.linkForm.header.addAssets"),
          );
          break;
        case LinkStep.CHOOSE_TYPE:
        default:
          appHeaderStore.setHeaderName(
            newLink.createLinkData.title.trim() ||
              locale.t("links.linkForm.header.linkName"),
          );
          break;
      }
    }
  });
</script>

<div class="grow-1 flex flex-col mt-2 sm:mt-0">
  <CreateLinkHeader link={linkStore} onBack={handleBack} />

  {#if linkStore.state.step === LinkStep.CHOOSE_TYPE}
    <ChooseLinkType link={linkStore} />
  {:else if linkStore.state.step === LinkStep.ADD_ASSET}
    <AddAsset link={linkStore} />
  {:else if linkStore.state.step === LinkStep.PREVIEW}
    <Preview link={linkStore} />
  {:else if linkStore.state.step === LinkStep.CREATED}
    <CreatedLink link={linkStore} />
  {/if}
</div>
