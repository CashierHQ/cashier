<script lang="ts">
  import { page } from "$app/state";
  import { buildRedirectInput } from "$modules/routing/inputs/buildRedirectInput";
  import { resolveRedirect } from "$modules/routing/resolvers/resolveRedirect";
  import { getRouteContext } from "$modules/routing/state/routeContext.svelte";
  import type { RedirectDecision } from "$modules/routing/types";
  import { createRedirectNavigation } from "$modules/routing/state/createRedirectNavigation.svelte";
  import ProtectionProcessingState from "$modules/routing/components/ProtectionProcessingState.svelte";
  import type { Snippet } from "svelte";

  let {
    children,
    loading,
  }: {
    children: Snippet<[RedirectDecision]>;
    loading?: Snippet;
  } = $props();

  const context = getRouteContext();
  // Convert route stores into pure redirect input, then let policy decide.
  const input = $derived(buildRedirectInput(context, page.url));
  const decision = $derived(resolveRedirect(input));

  createRedirectNavigation(() => decision);
</script>

{#if decision.kind === "pending"}
  {#if loading}
    {@render loading()}
  {:else}
    <ProtectionProcessingState message="Loading..." />
  {/if}
{:else if decision.kind === "allow"}
  {@render children(decision)}
{:else}
  <ProtectionProcessingState message="Redirecting..." />
{/if}
