<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import DetailFlowProtected from "$modules/detailLink/components/detailFlowProtected.svelte";
  import DetailLink from "$modules/detailLink/pages/detail.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { appHeaderStore } from "$modules/shared/state/appHeaderStore.svelte";
  import { onMount } from "svelte";

  const id = page.params.id;
  let linkDetailStore = $state<LinkDetailStore | null>(null);

  const handleBack = async () => {
    goto(resolve("/links"));
  };

  onMount(() => {
    if (!id) {
      goto(resolve("/links"));
      return;
    }

    linkDetailStore = new LinkDetailStore({ id });
    appHeaderStore.setBackHandler(handleBack);

    // Cleanup back handler on unmount
    return () => {
      appHeaderStore.clearBackHandler();
    };
  });
</script>

{#if !id}
  <div>Invalid link ID</div>
{:else if !linkDetailStore}
  <div>Loading...</div>
{:else}
  <DetailFlowProtected linkStore={linkDetailStore}>
    <DetailLink { id }/>
  </DetailFlowProtected>
{/if}
