<script lang="ts">
  import { LinkStep } from "$modules/links/types/linkStep";
  import { LinkCreationStore } from "$modules/links/state/linkCreationStore.svelte";
  import AddAsset from "$modules/links/components/createLink/addAsset.svelte";
  import ChooseLinkType from "$modules/links/components/createLink/chooseLinkType.svelte";
  import Preview from "../components/createLink/preview.svelte";
  import CreateLinkHeader from "$modules/links/components/createLink/createLinkHeader.svelte";
  import CreatedLink from "../components/createLink/createdLink.svelte";
  import tempLinkService from "../services/tempLinkService";
  import { onMount } from "svelte";
  import { authState } from "$modules/auth/state/auth.svelte";

  let newLink: LinkCreationStore | undefined = $state(undefined);

  onMount(() => {
    const owner = authState?.account?.owner ?? "";
    const tempLink = tempLinkService.getCurrentCreateLink(owner);
    newLink = tempLink ? new LinkCreationStore(tempLink) : undefined;
  });
</script>

{#if !newLink}
  <div>Some thing went wrong</div>
{:else}
  <div class="space-y-6 p-4">
    <CreateLinkHeader link={newLink} />

    {#if newLink.state.step === LinkStep.CHOOSE_TYPE}
      <ChooseLinkType link={newLink} />
    {:else if newLink.state.step === LinkStep.ADD_ASSET}
      <AddAsset link={newLink} />
    {:else if newLink.state.step === LinkStep.PREVIEW}
      <Preview link={newLink} />
    {:else if newLink.state.step === LinkStep.CREATED}
      <CreatedLink link={newLink} />
    {/if}
  </div>
{/if}
