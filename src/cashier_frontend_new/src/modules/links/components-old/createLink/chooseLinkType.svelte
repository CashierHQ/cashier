<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import {
    LinkType,
    type LinkTypeValue,
  } from "$modules/links/types/link/linkType";
  import { LinkStep } from "$modules/links/types/linkStep";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.CHOOSE_TYPE) {
      goto(resolve("/links"));
    }
  });
  let errorMessage: string | null = $state(null);

  // Navigate back to home (cancel)
  function goBack() {
    goto(resolve("/links"));
  }

  // Handle input changes
  function handleOnInput(
    e: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    },
  ) {
    link.createLinkData = {
      ...link.createLinkData,
      title: e.currentTarget.value,
    };
  }

  // Handle select changes
  function handleSelectLinkType(
    e: Event & {
      currentTarget: EventTarget & HTMLSelectElement;
    },
  ) {
    link.createLinkData = {
      ...link.createLinkData,
      linkType: e.currentTarget.value as LinkTypeValue,
    };
  }

  // Proceed to the next step
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
      value={link.createLinkData.title}
      oninput={handleOnInput}
      placeholder="Enter a title for your link"
    />
  </div>

  <div>
    <Label for="linkType">Link type</Label>
    <select
      id="linkType"
      class="block w-full rounded-md border px-3 py-2 text-base"
      value={link.createLinkData.linkType}
      onchange={handleSelectLinkType}
    >
      <option value={LinkType.TIP}>Tip</option>
      <option value={LinkType.AIRDROP}>Airdrop</option>
      <option value={LinkType.TOKEN_BASKET}>Token basket</option>
    </select>
  </div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}

  <Button onclick={goBack}>Back</Button>

  <Button onclick={goNext}>Next</Button>
</div>
