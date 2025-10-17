<script lang="ts">
  import { linkQuery } from "../state/link.svelte";

  const {
    id,
  }: {
    id: string;
  } = $props();

  let link = linkQuery(id);
  console.log("link detail", link);
</script>

<li>
  {#if link.isLoading}
    Loading...
  {/if}
  {#if link.error}
    Cannot fetch links list: {link.error}
  {/if}
  {#if link.data}
    <pre>Id {link.data.link.id}</pre>
    <pre>State: {JSON.stringify(link.data.link.state)}</pre>
  {/if}
</li>
