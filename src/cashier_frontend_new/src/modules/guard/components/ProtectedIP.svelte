<script lang="ts">
  import { PROTECTED_IP_BLOCKING_ENABLE } from '$modules/guard/constants';
  import { queryUserCountryLocation } from '$modules/guard/services/ip_resolver';
  import { onMount, type Snippet } from "svelte";
  import ProtectionProcessingState from "./ProtectionProcessingState.svelte";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  let shouldShow = $state(false);
  const BLACK_LISTED_COUNTRY_CODES = ['US'];

  onMount(async () => {
    // Resolve user country location
    const countryCode = await queryUserCountryLocation();
    console.log("User country code:", countryCode);

    if (PROTECTED_IP_BLOCKING_ENABLE && countryCode && BLACK_LISTED_COUNTRY_CODES.includes(countryCode)) {
      // Block access for blacklisted countries
      shouldShow = false;

      alert("Access to this application is restricted in your region.");
      return;
    }
    
    shouldShow = true;
  });
</script>

{#if shouldShow}
  {@render children()}
{:else}
  <ProtectionProcessingState message="Loading..." />
{/if}
