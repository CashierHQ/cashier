<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { LinkStep } from "../../types/linkStep";
  import { resolve } from "$app/paths";
  import LinkDetails from "./linkDetails.svelte";
  import TxCart from "../txCart/txCart.svelte";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.CREATED) {
      goto(resolve("/"));
    }
  });

  // Navigate back to the previous step
  async function goBack() {
    goto(resolve("/"));
  }
  async function goNext() {
    try {
      if (!link.id) {
        console.error("Missing link.id, cannot navigate");
        return;
      }
      await link.goNext();
      goto(resolve(`/link/detail/${link.id}`));
    } catch (error) {
      console.error("Failed to go next: ", error);
    }
  }

  // Create the link
  async function create() {
    alert("WIP execute action " + link.id);
  }
</script>

<h3 class="text-lg font-semibold">Created</h3>
<div class="mt-2">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <div class="flex gap-2 mt-4">
    <Button onclick={goBack}>Back</Button>
    <Button onclick={create}>Create</Button>
  </div>

  <TxCart {link} {goNext} />
</div>
