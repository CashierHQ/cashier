<script lang="ts">  
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { addToken } from '$modules/token/state/tokenStore.svelte';
  import { Principal } from '@dfinity/principal';

  let canisterId: string = $state("");
  let errorMessage: string = $state("");
  let successMessage: string = $state("");

  async function handleAddToken(canisterId: string) {
    if (!canisterId) {
      errorMessage = "Canister ID cannot be empty";
      return;
    }

    errorMessage = "";
    successMessage = "";

    try {
      const principal = Principal.fromText(canisterId);
      await addToken(principal);
      successMessage = "Token added successfully!";
    } catch (error) {
      errorMessage = "Failed to add token: " + error;
    }
  }
</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet/manage"))}>Back to Manage tokens</Button>
</div>

<div>
  <h2>Add Tokens</h2>
  {#if errorMessage}
    <p style="color: red;">{errorMessage}</p>
  {/if}
  {#if successMessage}
    <p style="color: green;">{successMessage}</p>
  {/if}
  <span>CanisterID</span>
  <input type="text" bind:value={canisterId} style="border: 1px solid #ccc;" /><br />
  <Button onclick={() => handleAddToken(canisterId)}>Add Token</Button>
</div>