<script lang="ts">
  import { locale } from "$lib/i18n";
  import LinkCreationProgressBar from "$modules/creationLink/components/LinkCreationProgressBar.svelte";
  import {
    CREATE_LINK_PROGRESS_SEGMENTS,
    getCreateLinkCardHeaderDisplayName,
    getCreateLinkProgress,
  } from "$modules/creationLink/utils/createLinkHeader";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { ChevronLeft } from "lucide-svelte";

  const {
    linkTitle,
    linkStep,
    onBack,
  }: {
    linkTitle?: string;
    linkStep: LinkStep;
    onBack: () => Promise<void>;
  } = $props();

  const progress = $derived(getCreateLinkProgress(linkStep));
  const linkName = $derived(
    getCreateLinkCardHeaderDisplayName(linkStep, linkTitle),
  );
</script>

<div class="w-full flex-none mb-2">
  <div
    class="w-full hidden md:flex items-center justify-center mb-1.5 py-1 relative"
  >
    <h4
      class="scroll-m-20 text-lg font-semibold tracking-tight self-center transition-opacity duration-200"
    >
      {linkName}
    </h4>
    <button
      onclick={onBack}
      class="absolute left-0 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
      type="button"
      aria-label={locale.t("links.linkForm.header.back")}
    >
      <ChevronLeft class="w-[25px] h-[25px]" aria-hidden="true" />
    </button>
  </div>
  <LinkCreationProgressBar
    filledCount={progress}
    segmentCount={CREATE_LINK_PROGRESS_SEGMENTS}
  />
</div>
