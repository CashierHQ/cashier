<script lang="ts">
  import type { TokenMetadata } from "$modules/token/types";
  import { tokenMetadataQuery } from "../state/tokenStore.svelte";

  // DEMO: how to use managedState recursively

  interface Props {
    metadata: TokenMetadata;
  }

  let data: Props = $props();

  const tokenMetadata = tokenMetadataQuery(data.metadata.address);
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
