<script lang="ts">
  import CreateLink from "$modules/creationLink/pages/create.svelte";
  import { page } from "$app/state";
  const id = page.params.id;
</script>

{#if id}
  <div class="w-full grow-1 flex flex-col">
    <CreateLink {id} />
  </div>
{:else}
  <div class="grow-1 flex flex-col">Invalid link ID</div>
{/if}
