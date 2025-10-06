<script lang="ts">
  import createLinkState from "../stores/create-link.svelte";
  // local bindings to the shared state
  const data = createLinkState.data;
</script>

<h3 class="text-lg font-semibold">Preview</h3>
<div class="mt-2">
  <div><strong>Title:</strong> {data.title}</div>
  <div><strong>Link Type:</strong> {data.linkType}</div>
  {#if data.tipLink}
    <div><strong>Asset:</strong> {data.tipLink.asset}</div>
    <div><strong>Amount:</strong> {data.tipLink.amount}</div>
  {/if}

  <br />

  <div><strong>Link creation fee</strong></div>
  <div><strong>Amount:</strong> {0.003}</div>
</div>
