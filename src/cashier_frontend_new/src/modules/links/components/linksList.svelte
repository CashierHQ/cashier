<script lang="ts">
  // import { getTag } from "$lib/rsMatch";
  import { linkListQuery } from "../stores/links.svelte";

  //     const localList = export const linkListQuery = managedState<LinkDto[]>({
  //   queryFn: async () => {
  //     return (await cashierBackendService.getLinks()).unwrap();
  //   },
  // });
  // setTimeout(() => {
  //     linkListQuery.refresh();
  // }, 2500)
</script>

<li>
  {#if linkListQuery.isLoading}
    Loading...
  {/if}
  {#if linkListQuery.error}
    Cannot fetch links list: {linkListQuery.error}
  {/if}
  {#if linkListQuery.data}
    <ul>
      {#each linkListQuery.data as link}
        <li>
          - Link id: {link.id} - {JSON.stringify(link.link_type)} - {link.title}
        </li>
      {:else}
        <li><p>There are no links</p></li>
      {/each}
    </ul>
  {/if}
</li>
