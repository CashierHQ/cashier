<script lang="ts">
  import type { Snippet } from "svelte";
  import { getRouteGuardContext } from "$modules/shared/contexts/routeGuardContext.svelte";
  import ProtectedAuth from "./ProtectedAuth.svelte";
  import ProtectedValidLink from "./ProtectedValidLink.svelte";
  import ProtectedLinkOwner from "./ProtectedLinkOwner.svelte";
  import ProtectedLinkState from "./ProtectedLinkState.svelte";
  import ProtectedUserState from "./ProtectedUserState.svelte";
  import { GuardType, type GuardConfig } from "./types";

  let {
    guards,
    index,
    children,
  }: {
    guards: GuardConfig[];
    index: number;
    children: Snippet;
  } = $props();

  const context = getRouteGuardContext();
  const currentGuard = guards[index];

  $effect(() => {
    if (!currentGuard) {
      context.setGuardCheckComplete(true);
    }
  });
</script>

{#if !currentGuard}
  {@render children()}
{:else if currentGuard.type === GuardType.AUTH}
  <ProtectedAuth config={currentGuard}>
    <svelte:self {guards} index={index + 1}>
      {@render children()}
    </svelte:self>
  </ProtectedAuth>
{:else if currentGuard.type === GuardType.VALID_LINK}
  <ProtectedValidLink config={currentGuard}>
    <svelte:self {guards} index={index + 1}>
      {@render children()}
    </svelte:self>
  </ProtectedValidLink>
{:else if currentGuard.type === GuardType.LINK_OWNER}
  <ProtectedLinkOwner config={currentGuard}>
    <svelte:self {guards} index={index + 1}>
      {@render children()}
    </svelte:self>
  </ProtectedLinkOwner>
{:else if currentGuard.type === GuardType.LINK_STATE}
  <ProtectedLinkState config={currentGuard}>
    <svelte:self {guards} index={index + 1}>
      {@render children()}
    </svelte:self>
  </ProtectedLinkState>
{:else if currentGuard.type === GuardType.USER_STATE}
  <ProtectedUserState config={currentGuard}>
    <svelte:self {guards} index={index + 1}>
      {@render children()}
    </svelte:self>
  </ProtectedUserState>
{/if}
