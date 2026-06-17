<script lang="ts">
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";
  import RegionBlocked from "$modules/guard/components/RegionBlocked.svelte";
  import { userIPStore } from "$modules/guard/state/userIPStore.svelte";
  import { type Snippet } from "svelte";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  let isBlocked = $state(false);
  let isChecking = $state(true);

  // Check only once on mount
  $effect(() => {
    // Wait for query to complete
    if (userIPStore.query.isLoading) {
      isChecking = true;
      return;
    }

    isChecking = false;

    // Check if user is from blacklisted country using isBlacklisted() method
    // which checks against blacklist.json
    if (userIPStore.countryCode && userIPStore.isBlacklisted()) {
      isBlocked = true;
    } else {
      isBlocked = false;
    }
  });
</script>

{#if isChecking}
  <ProtectionProcessingState message="Loading..." />
{:else if isBlocked}
  <RegionBlocked />
{:else}
  {@render children()}
{/if}
