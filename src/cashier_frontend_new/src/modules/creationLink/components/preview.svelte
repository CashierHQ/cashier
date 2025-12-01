<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { linkListStore } from "$modules/links/state/linkListStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import LinkDetails from "./linkDetails.svelte";
  import { locale } from "$lib/i18n";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Create the link
  async function handleCreate() {
    errorMessage = null;
    successMessage = null;
    try {
      await link.goNext();
      linkListStore.refresh();
      successMessage = "Link created successfully: " + link.id;
    } catch (error) {
      errorMessage = "Failed to create link: " + error;
      return;
    }
  }
</script>

<div class="space-y-4 relative grow-1 flex flex-col mt-2 sm:mt-0">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <div
    class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
  >
    <Button
      onclick={handleCreate}
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      type="button"
    >
      {locale.t("links.linkForm.chooseType.create")}
    </Button>
  </div>
</div>
