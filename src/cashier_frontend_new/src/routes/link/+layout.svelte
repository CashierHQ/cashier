<script lang="ts">
  import AppHeader from "$modules/shared/components/AppHeader.svelte";

  let { children } = $props();
</script>

<div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
  <AppHeader />

  <div class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col">
    <div
      class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-4 grow-1 bg-white sm:rounded-xl"
    >
      <div
        class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-78px)] overflow-y-auto scrollbar-hide"
      >
        {@render children?.()}
      </div>
    </div>
  </div>
</div>
