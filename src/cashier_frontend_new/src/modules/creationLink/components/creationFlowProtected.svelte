<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import type { Snippet } from "svelte";

  let {
    linkStore,
    children,
  }: {
    linkStore: LinkCreationStore;
    children: Snippet<[]>;
  } = $props();

  const allowedSteps = [
    LinkStep.CHOOSE_TYPE,
    LinkStep.ADD_ASSET,
    LinkStep.PREVIEW,
    LinkStep.CREATED,
    LinkStep.ACTIVE,
  ];

  $effect(() => {
    if (!linkStore) return;

    const current = linkStore.state.step;
    const isAllowed = allowedSteps.includes(current);

    console.log(
      "CreationFlowProtected: current step =",
      current,
      "isAllowed =",
      isAllowed,
    );

    if (!isAllowed) {
      goto(resolve("/links"));
    }
  });
</script>

{#if allowedSteps.includes(linkStore.state.step)}
  {@render children()}
{/if}
