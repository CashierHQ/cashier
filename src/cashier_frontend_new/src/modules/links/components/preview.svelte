<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import { LinkStep } from "$modules/links/types";

  interface Props {
    link: LinkStore;
  }

  const { link }: Props = $props();
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  $effect(() => {
    if (link.state.step !== LinkStep.PREVIEW) {
      goto(resolve("/"));
    }
  });

  async function goBack() {
    try {
      await link.goBack();
    } catch (error) {
      console.error("Failed to go back: ", error);
    }
  }

  // Submit via shared createLinkState
  async function submit() {
    errorMessage = null;
    successMessage = null;

    try {
      await link.goNext();
      successMessage = "Link created successfully: " + link.id;
    } catch (error) {
      errorMessage = "Failed to create link: " + error;
      return;
    }
  }
</script>

<h3 class="text-lg font-semibold">Preview</h3>
<div class="mt-2">
  <div><strong>Title:</strong> {link.title}</div>
  <div><strong>Link Type:</strong> {link.linkType}</div>
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

  <div class="flex gap-2 pt-4">
    <button class="px-4 py-2 rounded" onclick={goBack}>Back</button>
    <button class="px-4 py-2 rounded bg-primary text-white" onclick={submit}>
      Submit
    </button>
  </div>
</div>
