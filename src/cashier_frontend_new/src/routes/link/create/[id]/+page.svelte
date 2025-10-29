<script lang="ts">
  import CreatedLink from "$modules/links/pages/createdLink.svelte";
  import { page } from "$app/state";
  import { linkDetailStore } from "$modules/links/state/linkDetailStore.svelte";
  import { ActionType } from "$modules/links/types/action/actionType";

  const id = page.params.id;

  if (!id) {
    throw new Error("Link ID is required");
  }

  const linkDetail = linkDetailStore(id, ActionType.CreateLink);
</script>

{#if linkDetail.isLoading}
  <p>Loading link details...</p>
{:else if linkDetail.error}
  <p class="text-red-500">Error loading link details: {linkDetail.error}</p>
{/if}

{#if linkDetail.data}
  <CreatedLink linkAndAction={linkDetail.data} />
{/if}
