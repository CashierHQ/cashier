<script lang="ts">
  import { page } from "$app/state";
  import CreateLinkWithId from "$modules/links/pages/createWithId.svelte";

  const id = page.params.id;
</script>

{#if id}
  <CreateLinkWithId {id} />
{/if}
