<script lang="ts">
  import AppHeader from "$modules/app/components/layout/AppHeader.svelte";
  import AddLinkButton from "$modules/app/components/layout/AddLinkButton.svelte";
  import { LinkCreationStore } from "$modules/links/state/linkCreationStore.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { authState } from "$modules/auth/state/auth.svelte";

  let { children } = $props();

  function handleCreateNewLink() {
    if (!authState.account?.owner){
      throw new Error("Cannot create link: no account owner found");
    }
   const tempLink =  LinkCreationStore.createTempLink(authState.account?.owner);
    goto(resolve(`/app/create/${tempLink.id}`));
  }
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

  <AddLinkButton onClick={handleCreateNewLink} />
</div>
