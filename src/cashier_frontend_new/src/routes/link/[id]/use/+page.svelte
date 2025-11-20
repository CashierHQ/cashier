<script lang="ts">
  import { page } from "$app/state";
  import UseLink from "$modules/useLink/pages/use.svelte";
  const id = page.params.id;
</script>

{#if id}
  <UseLink {id} />
{/if}
