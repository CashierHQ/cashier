<script lang="ts">  
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { walletStore } from '$modules/token/state/walletStore.svelte';

  let canisterId: string = $state("");
  let errorMessage: string = $state("");
  let successMessage: string = $state("");

  async function handleAddToken(canisterId: string) {
    if (!validate()) {
      return;
    }

    errorMessage = "";
    successMessage = "";

    try {
      await walletStore.addToken(canisterId);
      successMessage = "Token added successfully!";
    } catch (error) {
      errorMessage = "Failed to add token: " + error;
    }
  }

  function validate(): boolean {
    if (!canisterId) {
      errorMessage = "Canister ID cannot be empty";
      return false;
    }
    return true;
  }
</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet/manage"))}>Back to Manage tokens</Button>
</div>

<div>
  {#if walletStore.query.data}
    <h2>Add token</h2>
    <div class="py-4">
      {#if errorMessage}
        <p style="color: red;">{errorMessage}</p>
      {/if}
      {#if successMessage}
        <p style="color: green;">{successMessage}</p>
      {/if}
      <span>CanisterID</span>
      <input type="text" bind:value={canisterId} style="border: 1px solid #ccc;" />
    </div>
    <Button onclick={() => handleAddToken(canisterId)}>Add Token</Button>
  {:else if walletStore.query.isSuccess}
    <p style="color: red">No tokens found in wallet.</p>
  {:else if walletStore.query.error}
    <p style="color: red;">
      An error has occurred:
      {walletStore.query.error}
    </p>
  {:else}
    Loading...
  {/if}
</div>