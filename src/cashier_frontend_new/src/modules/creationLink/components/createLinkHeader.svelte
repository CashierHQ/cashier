<script lang="ts">
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { locale } from "$lib/i18n";
  import { ChevronLeft } from "lucide-svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  const progress = $derived.by(() => {
    const step = link?.state?.step;
    if (step === LinkStep.CHOOSE_TYPE) return 1;
    if (step === LinkStep.ADD_ASSET) return 2;
    if (step === LinkStep.PREVIEW || step === LinkStep.CREATED) return 3;
    return 0;
  });

  const linkName = $derived(
    link.createLinkData.title.trim() ||
      locale.t("links.linkForm.header.linkName"),
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
      onclick={async () => await link.goBack()}
      class="absolute left-0 cursor-pointer text-[1.5rem] transition-transform hover:scale-105"
      type="button"
      aria-label={locale.t("links.linkForm.header.back")}
    >
      <ChevronLeft class="w-[25px] h-[25px]" aria-hidden="true" />
    </button>
  </div>
  <div class="flex w-full mb-3">
    <div
      class="h-[6px] rounded-full mx-[2px] transition-all duration-300 {progress >=
      1
        ? 'bg-green'
        : 'bg-lightgreen'}"
      style="width: 33.3333%;"
    ></div>
    <div
      class="h-[6px] rounded-full mx-[2px] transition-all duration-300 {progress >=
      2
        ? 'bg-green'
        : 'bg-lightgreen'}"
      style="width: 33.3333%;"
    ></div>
    <div
      class="h-[6px] rounded-full mx-[2px] transition-all duration-300 {progress >=
      3
        ? 'bg-green'
        : 'bg-lightgreen'}"
      style="width: 33.3333%;"
    ></div>
  </div>
</div>
