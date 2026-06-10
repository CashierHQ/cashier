<script lang="ts">
  import { page } from "$app/state";
  import { getRouteContext } from "$modules/routing/routeContext.svelte";
  import ProtectionProcessingState from "$modules/routing/components/ProtectionProcessingState.svelte";
  import { buildRedirectInput } from "$modules/routing/buildRedirectInput";
  import { resolveRedirect } from "$modules/routing/resolveRedirect";
  import type { RedirectDecision } from "$modules/routing/types";
  import { useRedirectNavigation } from "$modules/routing/useRedirectNavigation.svelte";
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

  useRedirectNavigation(() => decision);
</script>

{#if decision.kind === "pending"}
  <ProtectionProcessingState message="Loading..." />
{:else if decision.kind === "allow"}
  {@render children(decision)}
{:else}
  <ProtectionProcessingState message="Redirecting..." />
{/if}
