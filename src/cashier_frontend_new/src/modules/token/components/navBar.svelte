<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";

  let currentPath = $derived.by(() => page.url.pathname);
  //console.log("Current Path:", $state.snapshot(currentPath));
</script>

<div class="py-4">
  {#if currentPath === "/wallet"}
    <Button onclick={() => goto(resolve("/links"))}>Go to Home</Button>
    <Button onclick={() => goto(resolve("/wallet/manage"))}
      >Manage Tokens</Button
    >
    <Button onclick={() => goto(resolve("/wallet/send"))}>Send</Button>
    <Button onclick={() => goto(resolve("/wallet/receive"))}>Receive</Button>
  {:else if currentPath === "/wallet/manage"}
    <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
    <Button onclick={() => goto(resolve("/wallet/addtoken"))}>Add Token</Button>
  {:else if currentPath === "/wallet/addtoken"}
    <Button onclick={() => goto(resolve("/wallet/manage"))}
      >Back to Manage Tokens</Button
    >
  {:else}
    <Button onclick={() => goto(resolve("/wallet"))}>Back to Wallet</Button>
  {/if}
</div>
