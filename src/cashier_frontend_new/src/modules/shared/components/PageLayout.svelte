<script lang="ts">
  import AppHeader from "./AppHeader.svelte";
  import Footer from "$modules/home/components/Footer.svelte";

  const {
    isLinkFormPage = false,
    isLink = false,
    showFooter = false,
    children,
  }: {
    isLinkFormPage?: boolean;
    isLink?: boolean;
    showFooter?: boolean;
    children: import("svelte").Snippet;
  } = $props();
</script>

<div
  class="flex flex-col min-h-screen {isLink ? '' : 'sm:bg-lightgreen'} bg-white"
>
  <AppHeader {isLinkFormPage} />

  <div
    class="flex-1 {isLink
      ? ''
      : 'sm:py-4'} pb-2 flex items-center justify-center flex-col"
  >
    <div
      class="w-full {isLink
        ? ''
        : 'sm:max-w-[600px] sm:p-8'} max-w-full px-4 grow-1 {isLink
        ? ''
        : 'bg-white'} sm:rounded-xl flex flex-col h-full"
    >
      <div
        class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-86px)] overflow-y-auto scrollbar-hide flex flex-col grow-1"
      >
        {@render children()}
      </div>
    </div>
  </div>
  {#if showFooter}
    <Footer />
  {/if}
</div>
