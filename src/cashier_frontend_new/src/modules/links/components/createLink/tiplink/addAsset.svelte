<script lang="ts">
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkStore } from "$modules/links/state/linkStore.svelte";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { parseBalanceUnits } from "$modules/token/utils/converter";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  // UI local state
  let selectedAddress: string | null = $state(link.tipLink?.asset ?? null);
  let amountStr: string = $state("");
  
  // Initialize amountStr from stored data if available
  $effect(() => {
    if (link.tipLink?.amount && selectedAddress) {
      const selectedToken = getSelectedToken();
      if (selectedToken) {
        const userAmount = link.tipLink.amount / Math.pow(10, selectedToken.decimals);
        amountStr = userAmount.toString();
      } else {
        amountStr = link.tipLink.amount.toString();
      }
    } else {
      amountStr = "";
    }
  });

  // Get selected token metadata
  function getSelectedToken() {
    if (!selectedAddress || !walletStore.query.data) return null;
    return walletStore.query.data.find(token => token.address === selectedAddress) || null;
  }

  // Convert amount string to number (base units) using token decimals
  function convertAmountToBaseUnits(amountStr: string, decimals: number): number {
    const amount = Number(amountStr);
    if (Number.isNaN(amount) || amount <= 0) return 0;
    
    // Convert to base units (e.g., ICP to e8s)
    const multiplier = Math.pow(10, decimals);
    return Math.round(amount * multiplier);
  }

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.ADD_ASSET) {
      goto(resolve("/"));
    }
  });

  // effect to update the store
  $effect(() => {
    if (selectedAddress && amountStr) {
      const selectedToken = getSelectedToken();
      if (selectedToken) {
        const amountBaseUnits = convertAmountToBaseUnits(amountStr, selectedToken.decimals);
        if (amountBaseUnits > 0) {
          link.tipLink = { asset: selectedAddress, amount: amountBaseUnits };
          return;
        }
      }
    }

    // Clear tipLink when selection/amount is invalid or missing
    link.tipLink = undefined;
  });

  // Error message state
  let errorMessage: string | null = $state(null);

  // Navigate back to previous step
  function goBack() {
    goto(resolve("/"));
  }
  async function goNext() {
    errorMessage = null;
    try {
      await link.goNext();
    } catch (e) {
      errorMessage = "Failed to proceed to next step: " + e;
    }
  }
</script>

<div class="space-y-4">
  {#if walletStore.query.data}
    <div>
      <Label>Choose asset</Label>
      <ul class="space-y-2">
        {#each walletStore.query.data as token (token.address)}
          <li>
            <button
              type="button"
              class="w-full text-left p-2 border rounded cursor-pointer"
              class:bg-gray-100={selectedAddress === token.address}
              onclick={() => (selectedAddress = token.address)}
            >
              <div class="flex justify-between items-center">
                <div>
                  <strong>{token.symbol}</strong> — {token.name}
                  <div class="text-sm">
                    Balance: {parseBalanceUnits(
                      token.balance,
                      token.decimals,
                    ).toFixed(5)}
                  </div>
                </div>
                {#if selectedAddress === token.address}
                  <div class="text-sm">Selected</div>
                {/if}
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {:else if walletStore.query.isSuccess}
    <p>No tokens found.</p>
  {:else if walletStore.query.error}
    <p class="text-red-600">Error: {walletStore.query.error}</p>
  {:else}
    <p>Loading tokens…</p>
  {/if}

  <div>
    <Label for="amount">Amount</Label>
    <Input
      id="amount"
      type="number"
      bind:value={amountStr}
      placeholder="0.00"
    />
  </div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}

  <Button onclick={goBack}>Back</Button>

  <Button onclick={goNext}>Next</Button>
</div>
