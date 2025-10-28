<script lang="ts">
  import { page } from "$app/state";
  import DetailLink from "$modules/links/pages/detail.svelte";
  const id = page.params.id;
</script>

{#if id}
  <DetailLink {id} />
{/if}
