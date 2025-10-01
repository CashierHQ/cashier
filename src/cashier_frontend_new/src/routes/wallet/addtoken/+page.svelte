<script lang="ts">  
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from '$lib/shadcn/components/ui/button/button.svelte';
  import { addToken } from '$modules/token/state/walletStore.svelte';
  import { Principal } from '@dfinity/principal';

  let canisterId: string = $state("");
  let errorMessage: string = $state("");

  async function handleAddToken(canisterId: string) {
    if (!canisterId) {
      errorMessage = "Canister ID cannot be empty";
      return;
    }

    // Here you would typically also update the backend or local storage
    // to persist the added token.
    console.log("Adding Token with Canister ID:", canisterId);

    try {
      const principal = Principal.fromText(canisterId);
      await addToken(principal);
    } catch (error) {
      errorMessage = "Invalid Canister ID";
      return;
    }
  }
</script>

<div class="py-6">
  <Button onclick={() => goto(resolve("/wallet/manage"))}>Back to Manage tokens</Button>
</div>

<div>
  <h2>Add Tokens</h2>
  <span>CanisterID</span>
  <input type="text" bind:value={canisterId} />
  <Button onclick={() => handleAddToken(canisterId)}>Add Token</Button>
  {#if errorMessage}
    <p style="color: red;">{errorMessage}</p>
  {/if}
</div>