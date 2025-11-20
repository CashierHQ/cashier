<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import type { LinkDetailStore } from "../state/linkDetailStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { authState } from "$modules/auth/state/auth.svelte";
  import type { Snippet } from "svelte";

  let {
    linkStore,
    children,
  }: {
    linkStore: LinkDetailStore;
    children: Snippet<[]>;
  } = $props();

  const allowedSteps = [
    LinkStep.CREATED,
    LinkStep.ACTIVE,
    LinkStep.INACTIVE,
    LinkStep.ENDED,
  ];

  const isCreator = $derived(
    linkStore.link?.creator != null &&
      authState.account?.owner != null &&
      linkStore.link.creator.toString() === authState.account.owner,
  );

  $effect(() => {
    if (!linkStore.link) {
      goto(resolve("/links"));
      return;
    }

    const current = linkStore.state.step;
    const isAllowedStep = allowedSteps.includes(current);

    if (!isAllowedStep || !isCreator) {
      goto(resolve("/links"));
    }
  });
</script>

{#if linkStore && linkStore.link && allowedSteps.includes(linkStore.state.step) && isCreator}
  {@render children()}
{:else if !linkStore || !linkStore.link}
  <div>Loading...</div>
{/if}
