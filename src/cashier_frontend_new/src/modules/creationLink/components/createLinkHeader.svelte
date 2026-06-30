<script lang="ts">
  import { locale } from "$lib/i18n";
  import LinkCreationProgressBar from "$modules/creationLink/components/LinkCreationProgressBar.svelte";
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

  const segmentCount = 4;

  const progress = $derived.by(() => {
    if (linkStep === LinkStep.CHOOSE_TYPE) return 1;
    if (linkStep === LinkStep.ADD_ASSET) return 2;
    if (linkStep === LinkStep.LOCK) return 3;
    if (linkStep === LinkStep.PREVIEW || linkStep === LinkStep.CREATED) {
      return 4;
    }
    return 0;
  });

  const linkName = $derived.by(() => {
    if (linkStep === LinkStep.ADD_ASSET) {
      return locale.t("links.linkForm.header.addAssets");
    }

    if (linkStep === LinkStep.LOCK) {
      return locale.t("links.linkForm.lock.title");
    }

    if (linkStep === LinkStep.PREVIEW) {
      return locale.t("links.linkForm.header.createLink");
    }

    return linkTitle?.trim() || locale.t("links.linkForm.header.linkName");
  });
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
  <LinkCreationProgressBar filledCount={progress} {segmentCount} />
</div>
