<script lang="ts">
  import { queryUserCountryLocation } from '$modules/guard/services/ip_resolver';
  import { onMount, type Snippet } from "svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();


  let shouldShow = $state(false);

  onMount(async () => {
    // Resolve user country location
    const countryCode = await queryUserCountryLocation();
    console.log("User country code:", countryCode);
    shouldShow = true;
  });
</script>

{#if shouldShow}
  {@render children()}
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
