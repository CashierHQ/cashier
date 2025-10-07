<script lang="ts">
  import { resolve } from "$app/paths";
  import type { LinkStore } from "../../states/linkStore.svelte";

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: LinkStore;
    errorMessage: string | null;
    successMessage: string | null;
  } = $props();
</script>

<div>
  <div><strong>Title:</strong> {link.title}</div>
  <div>
    <strong>Link Type:</strong>
    {link.linkType.id}
  </div>
  {#if link.tipLink}
    <div>
      <strong>Asset:</strong>
      {link.tipLink.asset}
    </div>
    <div>
      <strong>Amount:</strong>
      {link.tipLink.amount}
    </div>
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

  {#if link?.id}
    <div class="mt-2">
      <strong>Your link:</strong>
      <div class="break-all text-blue-600">
        {resolve("/link/")}{link.id}
      </div>
    </div>
  {/if}
</div>
