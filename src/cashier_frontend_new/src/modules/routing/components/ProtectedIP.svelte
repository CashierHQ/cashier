<script lang="ts">
  import ProtectionProcessingState from "$modules/routing/components/ProtectionProcessingState.svelte";
  import RegionBlocked from "$modules/routing/components/RegionBlocked.svelte";
  import { userIPStore } from "$modules/routing/state/userIPStore.svelte";
  import { resolveIpProtection } from "$modules/routing/ipProtection";
  import { type Snippet } from "svelte";

  let {
    children,
  }: {
    children: Snippet;
  } = $props();

  const decision = $derived(
    resolveIpProtection({
      isLoading: userIPStore.query.isLoading,
      countryCode: userIPStore.countryCode ?? null,
      isBlacklisted: userIPStore.isBlacklisted(),
    }),
  );
</script>

{#if decision.kind === "pending"}
  <ProtectionProcessingState message="Loading..." />
{:else if decision.kind === "block"}
  <RegionBlocked />
{:else}
  {@render children()}
{/if}
