<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { LinkDetailStore } from "../state/linkDetailStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { authState } from "$modules/auth/state/auth.svelte";

  let {
    linkStore,
    allowSteps,
    children,
  }: {
    linkStore: LinkDetailStore;
    allowSteps: LinkStep[];
    children: import("svelte").Snippet<[]>;
  } = $props();

  $effect(() => {
    if (!linkStore || !allowSteps) return;

    const current = linkStore.state.step;
    const isAllowedStep = Array.isArray(allowSteps)
      ? allowSteps.includes(current)
      : current === allowSteps;

    const isCreator =
      linkStore.link?.creator.toString() === authState.account?.owner;

    if (!isAllowedStep || !isCreator) {
      goto(resolve("/links"));
    }
  });
</script>

{#if allowSteps.includes(linkStore.state.step)}
  {@render children()}
{/if}
