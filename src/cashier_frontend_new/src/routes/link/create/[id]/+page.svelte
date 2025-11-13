<script lang="ts">
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import { page } from "$app/state";
  const id = page.params.id;
</script>

{#if id}
  <div class="w-full">
    <h1 class="text-2xl font-bold mb-4">Create Link</h1>
    <CreateLink {id} />
  </div>
{:else}
  <div>Invalid link ID</div>
{/if}
