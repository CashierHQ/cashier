<script lang="ts">
  import ProtectionProcessingState from "$modules/guard/components/ProtectionProcessingState.svelte";
  import { userIPStore } from '$modules/guard/state/userIPStore.svelte';
  import { type Snippet } from "svelte";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  let shouldShow = $state(false);

  $effect(() => {
    if (userIPStore.countryCode && userIPStore.isBlacklisted()) {
      alert(
        "Sorry for the inconvenience, access from your location is restricted."
      );
      shouldShow = false;
    } else {
      shouldShow = true;
    }
  });
</script>

{#if shouldShow}
  {@render children()}
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
