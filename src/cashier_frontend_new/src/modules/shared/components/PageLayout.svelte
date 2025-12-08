<script lang="ts">
  import AppHeader from "./AppHeader.svelte";

  const {
    isCreateOrEditPage = false,
    isLink = false,
    children,
  }: {
    isCreateOrEditPage?: boolean;
    isLink?: boolean;
    children: import("svelte").Snippet;
  } = $props();
</script>

<div
  class="flex flex-col min-h-screen {isLink ? '' : 'sm:bg-lightgreen'} bg-white"
>
  <AppHeader {isCreateOrEditPage} />

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
</div>
