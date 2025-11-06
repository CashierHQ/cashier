<script lang="ts">
  import { page } from "$app/state";
  import EditLinkPage from "$modules/app/pages/EditLinkPage.svelte";
  
  const id = page.params.id;
</script>

{#if id}
  <EditLinkPage linkId={id} />
{/if}

