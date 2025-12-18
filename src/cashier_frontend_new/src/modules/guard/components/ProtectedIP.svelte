<script lang="ts">
  import { type Snippet } from "svelte";
  import { userIPStore } from '../state/userIPStore.svelte';
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

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
