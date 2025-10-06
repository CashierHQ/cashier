<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import { LinkStep, LinkType } from "../types";

  interface Props {
    link: LinkStore;
  }

  const { link }: Props = $props();

  $effect(() => {
    if (link.state.step !== LinkStep.CHOOSE_TYPE) {
      goto(resolve("/"));
    }
  });

  let errorMessage: string | null = $state(null);

  function goBack() {
    goto(resolve("/"));
  }

  async function goNext() {
    errorMessage = null;
    try {
      await link.goNext();
    } catch (e) {
      errorMessage = "Failed to proceed to next step: " + e;
    }
  }
</script>

<div class="space-y-4">
  <div>
    <Label for="title">Link title</Label>
    <Input
      id="title"
      bind:value={link.title}
      placeholder="Enter a title for your link"
    />
  </div>

  <div>
    <Label for="linkType">Link type</Label>
    <select
      id="linkType"
      class="block w-full rounded-md border px-3 py-2 text-base"
      bind:value={link.linkType}
    >
      <option value={LinkType.TIP}>Tip</option>
      <option value={LinkType.AIRDROP}>Airdrop</option>
      <option value={LinkType.TOKEN_BASKET}>Token basket</option>
    </select>
  </div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}

  <button class="px-4 py-2 rounded" onclick={goBack}>Back</button>

  <button class="px-4 py-2 rounded bg-primary text-white" onclick={goNext}>
    Next
  </button>
</div>
