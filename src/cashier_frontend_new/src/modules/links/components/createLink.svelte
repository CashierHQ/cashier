<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../stores/linkStore.svelte";
  import { LinkStep } from "../types/linkStep";
  import { resolve } from "$app/paths";

  interface Props {
    link: LinkStore;
  }
  const { link }: Props = $props();
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  $effect(() => {
    if (link.state.step !== LinkStep.CREATED)  {
      goto(resolve("/"));
    }
  });
  async function goBack() {
    goto(resolve("/"));
  }
  async function create() {
    alert("WIP execute action " + link.id);
  }
</script>

<h3 class="text-lg font-semibold">Preview</h3>
<div class="mt-2">
  <div><strong>Title:</strong> {link.title}</div>
  <div><strong>Link Type:</strong> {link.linkType.id}</div>
  {#if link.tipLink}
    <div><strong>Asset:</strong> {link.tipLink.asset}</div>
    <div><strong>Amount:</strong> {link.tipLink.amount}</div>
  {/if}

  <br />

  <div><strong>Link creation fee</strong></div>
  <div><strong>Amount:</strong> {0.003}</div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}
  {#if successMessage}
    <div class="text-green-600">{successMessage}</div>
  {/if}

  {#if link.id}
    <div class="mt-2">
      <strong>Your link:</strong>
      <div class="break-all text-blue-600">
        {resolve("/link/")}{link.id}
      </div>  
    </div>
  {/if}

  <Button onclick={goBack}>Back</Button>

  <Button onclick={
    create
  }>Create</Button>
</div>
