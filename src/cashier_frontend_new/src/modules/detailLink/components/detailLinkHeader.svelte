<script lang="ts">
  import type { LinkDetailStore } from "../state/linkDetailStore.svelte";
  import { locale } from "$lib/i18n";
  import { ChevronLeft } from "lucide-svelte";

  const {
    linkStore,
    onBack,
  }: {
    linkStore: LinkDetailStore;
    onBack: () => Promise<void>;
  } = $props();

  const linkName = $derived.by(() => {
    return linkStore.link?.title || locale.t("links.linkForm.header.linkName");
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
</div>

