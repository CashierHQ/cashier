<script lang="ts">
  import { tokenMetadataQuery } from "../state/tokenStore.svelte";

  // DEMO: how to use managedState recursively
  interface Props {
    address: string;
  }

  let data: Props = $props();

  const tokenMetadata = tokenMetadataQuery(data.address);
</script>

<li>
  - metadata: -- QUERY 1:
  {#if tokenMetadata.isLoading}
    Loading...
  {/if}
  {#if tokenMetadata.error}
    Cannot fetch token metadata
    <!-- {$tokenMetadataQuery.error.message} -->
  {/if}
  {#if tokenMetadata.isSuccess}
    decimals: {tokenMetadata.data?.decimals} - fee: {tokenMetadata.data?.fee}
  {/if}
</li>
