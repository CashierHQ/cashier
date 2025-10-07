<script lang="ts">
  import { resolve } from "$app/paths";
  import type { LinkStore } from "../../states/linkStore.svelte";

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: LinkStore | any;
    errorMessage: string | null;
    successMessage: string | null;
  } = $props();
</script>

<div>
  <div><strong>Title:</strong> {link?.data ? link.data.title : link.title}</div>
  <div>
    <strong>Link Type:</strong>
    {link?.data ? link.data.linkType.id : link.linkType.id}
  </div>
  {#if link?.data ? link.data.tipLink : link.tipLink}
    <div>
      <strong>Asset:</strong>
      {link?.data ? link.data.tipLink.asset : link.tipLink.asset}
    </div>
    <div>
      <strong>Amount:</strong>
      {link?.data ? link.data.tipLink.amount : link.tipLink.amount}
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
