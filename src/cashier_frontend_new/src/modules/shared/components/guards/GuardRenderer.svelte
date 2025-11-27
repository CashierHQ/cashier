<script lang="ts">
  import type { Snippet } from "svelte";
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

  const currentGuard = guards[index];
  const hasMore = index < guards.length - 1;
</script>

{#if !currentGuard}
  {@render children()}
{:else if currentGuard.type === GuardType.AUTH}
  <ProtectedAuth config={currentGuard}>
    {#if hasMore}
      <svelte:self {guards} index={index + 1}>
        {@render children()}
      </svelte:self>
    {:else}
      {@render children()}
    {/if}
  </ProtectedAuth>
{:else if currentGuard.type === GuardType.VALID_LINK}
  <ProtectedValidLink config={currentGuard}>
    {#if hasMore}
      <svelte:self {guards} index={index + 1}>
        {@render children()}
      </svelte:self>
    {:else}
      {@render children()}
    {/if}
  </ProtectedValidLink>
{:else if currentGuard.type === GuardType.LINK_OWNER}
  <ProtectedLinkOwner config={currentGuard}>
    {#if hasMore}
      <svelte:self {guards} index={index + 1}>
        {@render children()}
      </svelte:self>
    {:else}
      {@render children()}
    {/if}
  </ProtectedLinkOwner>
{:else if currentGuard.type === GuardType.LINK_STATE}
  <ProtectedLinkState config={currentGuard}>
    {#if hasMore}
      <svelte:self {guards} index={index + 1}>
        {@render children()}
      </svelte:self>
    {:else}
      {@render children()}
    {/if}
  </ProtectedLinkState>
{:else if currentGuard.type === GuardType.USER_STATE}
  <ProtectedUserState config={currentGuard}>
    {#if hasMore}
      <svelte:self {guards} index={index + 1}>
        {@render children()}
      </svelte:self>
    {:else}
      {@render children()}
    {/if}
  </ProtectedUserState>
{/if}

