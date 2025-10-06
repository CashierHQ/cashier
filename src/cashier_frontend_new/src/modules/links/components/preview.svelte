<script lang="ts">
  import createLinkState from "../stores/create-link.svelte";
</script>

<h3 class="text-lg font-semibold">Preview</h3>
<div class="mt-2">
  <div><strong>Title:</strong> {createLinkState.data.title}</div>
  <div><strong>Link Type:</strong> {createLinkState.data.linkType}</div>
  {#if createLinkState.data.tipLink}
    <div><strong>Asset:</strong> {createLinkState.data.tipLink.asset}</div>
    <div><strong>Amount:</strong> {createLinkState.data.tipLink.amount}</div>
  {/if}

  <br />

  <div><strong>Link creation fee</strong></div>
  <div><strong>Amount:</strong> {0.003}</div>
</div>
