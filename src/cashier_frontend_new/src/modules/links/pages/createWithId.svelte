<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import CreateLinkHeader from "$modules/links/components/createLink/createLinkHeader.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";
  import { linkDetailStore } from "../state/linkDetailStore.svelte";

  let { id }: { id: string } = $props();

  let newLink = new LinkStore();
  const linkDetail = linkDetailStore({
    id,
  });

  $effect(() => {
    if (linkDetail?.data?.link) {
      newLink.from(linkDetail.data?.link, linkDetail.data?.action);
    }
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
