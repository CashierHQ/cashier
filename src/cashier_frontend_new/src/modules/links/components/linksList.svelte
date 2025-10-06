<script lang="ts">
  import { linkListQuery } from "../state/links.svelte";
</script>../state/links.svelte

<li>
  {#if linkListQuery.isLoading}
    Loading...
  {/if}
  {#if linkListQuery.error}
    Cannot fetch links list: {linkListQuery.error}
  {/if}
  {#if linkListQuery.data}
    <ul>
      {#each linkListQuery.data as link (link.id)}
        <li>
          - Link id: {link.id} - {JSON.stringify(link.link_type)} - {link.title}
        </li>
      {:else}
        <li><p>There are no links</p></li>
      {/each}
    </ul>
  {/if}
</li>
