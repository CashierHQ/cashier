<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { linkListStore } from "$modules/links/state/linkListStore.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import LinkDetails from "$modules/creationLink/components/linkDetails.svelte";
  import { locale } from "$lib/i18n";
  import {
    trackEvent,
    AnalyticsEvent,
  } from "$modules/analytics/amplitudeStore";
  import { onMount } from "svelte";

  const {
    linkCreationStore,
  }: {
    linkCreationStore: LinkCreationStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isCreating = $state(false);

  onMount(() => {
    trackEvent(AnalyticsEvent.LINK_CREATION_PREVIEW_LANDING, {
      link_type: linkCreationStore.createLinkData.linkType,
      FE_link_id: linkCreationStore.id ?? "",
    });
  });

  async function handleCreate() {
    errorMessage = null;
    successMessage = null;
    isCreating = true;

    const feLinkId = linkCreationStore.id ?? "";

    trackEvent(AnalyticsEvent.LINK_CREATION_PREVIEW_CONTINUE, {
      link_type: linkCreationStore.createLinkData.linkType,
      FE_link_id: feLinkId,
    });

    try {
      await linkCreationStore.goNext();
      trackEvent(AnalyticsEvent.LINK_CREATION_CREATE_ACTION_PRESSED, {
        link_type: linkCreationStore.createLinkData.linkType,
        FE_link_id: feLinkId,
        BE_link_id: linkCreationStore.link?.id ?? "",
      });
      linkListStore.refresh();
      successMessage = "Link created successfully: " + linkCreationStore.id;
    } catch (error) {
      errorMessage = "Failed to create link: " + error;
      return;
    } finally {
      isCreating = false;
    }
  }
</script>

<div class="space-y-4 relative grow-1 flex flex-col mt-2 sm:mt-0">
  <LinkDetails link={linkCreationStore} {errorMessage} {successMessage} />

  <div
    class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
  >
    <Button
      onclick={handleCreate}
      disabled={isCreating}
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen gap-2"
      type="button"
    >
      {#if isCreating}
        <div
          class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
        ></div>
      {/if}
      {locale.t("links.linkForm.chooseType.create")}
    </Button>
  </div>
</div>
