<script lang="ts">
  import { page } from "$app/state";
  import DetailLink from "$modules/detailLink/pages/detail.svelte";
  const id = page.params.id;
</script>

{#if id}
  <DetailLink {id} />
{/if}
