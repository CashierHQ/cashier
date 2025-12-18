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
  const BLACK_LISTED_COUNTRY_CODES = ['US'];

  $effect(() => {
    if (userIPStore.countryCode) {
      console.log('User country code from store:', userIPStore.countryCode);
      shouldShow = true;
    }
  });
</script>

{#if shouldShow}
  {@render children()}
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
