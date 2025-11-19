<script lang="ts">
  import { page } from "$app/state";
  import Landing from "$modules/useLink/pages/landing.svelte";

  const id = page.params.id;
</script>

{#if id}
  <Landing {id} />
{/if}
