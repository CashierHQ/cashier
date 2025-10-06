<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { Link } from "$modules/links/state/linkStore.svelte";
  import { LinkStep } from "$modules/links/types";

  interface Props {
    link: Link;
  }

  const { link }: Props = $props();
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  $effect(() => {
    if (link.state.step !== LinkStep.CREATED) {
      goto(resolve("/"));
    }
  });

  async function goHome() {
    goto(resolve("/"));
  }
</script>

<h3 class="text-lg font-semibold">Details</h3>
<div class="mt-2">
  <div><strong>ID:</strong>{link.id}</div>
  <div><strong>Title:</strong> {link.title}</div>
  <div><strong>Link Type:</strong> {link.linkType}</div>
  {#if link.tipLink}
    <div><strong>Asset:</strong> {link.tipLink.asset}</div>
    <div><strong>Amount:</strong> {link.tipLink.amount}</div>
  {/if}

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}
  {#if successMessage}
    <div class="text-green-600">{successMessage}</div>
  {/if}

  <div class="flex gap-2 pt-4">
    <button class="px-4 py-2 rounded" onclick={goHome}>Go Home</button>
  </div>
</div>
