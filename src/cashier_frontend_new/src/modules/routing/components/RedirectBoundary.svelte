<script lang="ts">
  import { page } from "$app/state";
  import { buildRedirectInput } from "$modules/routing/inputs/buildRedirectInput";
  import { resolveRedirect } from "$modules/routing/resolveRedirect";
  import { getRouteContext } from "$modules/routing/state/routeContext.svelte";
  import type { RedirectDecision } from "$modules/routing/types";
  import { createRedirectNavigation } from "$modules/routing/createRedirectNavigation.svelte";
  import ProtectionProcessingState from "$modules/routing/components/ProtectionProcessingState.svelte";
  import type { Snippet } from "svelte";

  let {
    children,
  }: {
    children: Snippet<[RedirectDecision]>;
  } = $props();

  const context = getRouteContext();
  // Convert route stores into pure redirect input, then let policy decide.
  const input = $derived(buildRedirectInput(context, page.url));
  const decision = $derived(resolveRedirect(input));

  createRedirectNavigation(() => decision);
</script>

{#if decision.kind === "pending"}
  <ProtectionProcessingState message="Loading..." />
{:else if decision.kind === "allow"}
  {@render children(decision)}
{:else}
  <ProtectionProcessingState message="Redirecting..." />
{/if}
