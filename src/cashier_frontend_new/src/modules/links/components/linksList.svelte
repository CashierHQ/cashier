<script lang="ts">
    import { linkListQuery } from "../stores/links.svelte";
</script>

<li>
  {#if linkListQuery.isLoading}
    Loading...
  {/if}
  {#if linkListQuery.error}
    Cannot fetch links list
  {/if}
  {#if linkListQuery.data}
    <ul>
    {#each linkListQuery.data as link}
      <li> - Link id: {link.id} - {link.link_type} - {link.title}</li>    
    {/each}
    </ul>
  {/if}
</li>
