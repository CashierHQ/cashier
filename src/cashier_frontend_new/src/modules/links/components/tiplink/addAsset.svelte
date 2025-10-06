<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { LinkStore } from "$modules/links/state/linkStore.svelte";
  import { walletTokensQuery } from "$modules/token/state/walletStore.svelte";
  import { balanceToIcp } from "$modules/token/utils/converter";
  import { LinkStep } from "../../types";

  interface Props {
    link: LinkStore;
  }

  const { link }: Props = $props();
  let errorMessage: string | null = $state(null);

  $effect(() => {
    if (link.state.step !== LinkStep.ADD_ASSET) {
      goto(resolve("/"));
    }
  });

  // UI local state
  let selectedAddress: string | null = $derived(
    link.tipLink?.asset ?? null
  );
  let amountStr: string = $derived(
    link.tipLink?.amount?.toString() ?? "",
  );

  // effect to update the store
  $effect(() => {
    if (selectedAddress && amountStr) {
      const n = Number(amountStr);
      if (!Number.isNaN(n) && n > 0) {
        // TODO: convert amount to e8s based on token decimals
        link.tipLink = { asset: selectedAddress, amount: n };
        return;
      }
    }

    // Clear tipLink when selection/amount is invalid or missing
    link.tipLink = undefined;
  });

  async function goBack() {
    errorMessage = null;
    try {
      await link.goBack();
    } catch (error) {
      errorMessage = "Failed to go back: " + error;
    }
  }

  async function goNext() {
    errorMessage = null;
    try {
      await link.goNext();
    } catch (error) {
      errorMessage = "Failed to proceed to next step: " + error;
    }
  }
</script>

<div class="space-y-4">
  {#if walletTokensQuery.data}
    <div>
      <Label>Choose asset</Label>
      <ul class="space-y-2">
        {#each walletTokensQuery.data as token (token.address)}
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
                    Balance: {balanceToIcp(
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
  {:else if walletTokensQuery.isSuccess}
    <p>No tokens found.</p>
  {:else if walletTokensQuery.error}
    <p class="text-red-600">Error: {walletTokensQuery.error}</p>
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

  <button class="px-4 py-2 rounded" onclick={goBack}>Back</button>
  <button
    class="px-4 py-2 rounded bg-primary text-white"
    onclick={goNext}
  >
    Next
  </button>
</div>
