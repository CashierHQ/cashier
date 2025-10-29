<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";
  import type { LinkAndAction } from "../state/linkDetailStore.svelte";
  import CreateLinkHeader from "$modules/links/components/createLink/createLinkHeader.svelte";

  const {
    linkAndAction,
  }: {
    linkAndAction: LinkAndAction;
  } = $props();

  // Derive newLink based on whether we have link data from linkQueryState
  const newLink = $derived.by(() => {
    const linkStore = new LinkStore();
    linkStore.from(linkAndAction.link, linkAndAction.action);
    return linkStore;
  });

  $effect(() => {
    console.log("Current Link Step:", newLink.state.step);
  });
</script>

<div class="min-h-screen flex justify-center">
  <div class="w-1/3 max-w-full px-4">
    <div class="space-y-6 p-4">
      <CreateLinkHeader link={newLink} />
      {#if newLink.state.step === LinkStep.CREATED}
        <CreatedLink link={newLink} />
      {/if}
    </div>
  </div>
</div>
