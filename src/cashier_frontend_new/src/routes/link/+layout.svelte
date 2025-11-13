<script lang="ts">
  import AppHeader from "$modules/shared/components/AppHeader.svelte";
  import { getContext } from "svelte";
  import { LINK_BACK_CONTEXT_KEY } from "$modules/creationLink/context/linkBackContext";

  let { children } = $props();

  // Try to get back handler from context (if available from create.svelte)
  const onBack = getContext<(() => void | Promise<void>) | undefined>(
    LINK_BACK_CONTEXT_KEY,
  );
</script>

<div class="flex flex-col min-h-screen sm:bg-lightgreen bg-white">
  <AppHeader isCreateOrEditPage={true} {onBack} />

  <div class="flex-1 sm:py-4 pb-2 flex items-center justify-center flex-col">
    <div
      class="w-full sm:max-w-[600px] max-w-full sm:p-8 px-4 grow-1 bg-white sm:rounded-xl flex flex-col h-full"
    >
      <div
        class="sm:max-h-[calc(100vh-156px)] max-h-[calc(100vh-86px)] overflow-y-auto scrollbar-hide flex flex-col grow-1"
      >
        {@render children?.()}
      </div>
    </div>
  </div>
</div>
