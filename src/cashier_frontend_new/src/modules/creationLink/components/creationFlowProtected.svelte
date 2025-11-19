<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";

  let {
    linkStore,
    allowSteps,
    children,
  }: {
    linkStore: LinkCreationStore;
    allowSteps: LinkStep[];
    children: import("svelte").Snippet<[]>;
  } = $props();

  $effect(() => {
    if (!linkStore) return;
    if (!allowSteps) return;

    const current = linkStore.state.step;

    const isAllowed = Array.isArray(allowSteps)
      ? allowSteps.includes(current)
      : current === allowSteps;

    if (!isAllowed) {
      goto(resolve("/links"));
    }
  });
</script>

{#if allowSteps.includes(linkStore.state.step)}
  {@render children()}
{/if}
