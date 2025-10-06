<script lang="ts">
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { walletTokensQuery } from "$modules/token/state/walletStore.svelte";
  import { balanceToIcp } from "$modules/token/utils/converter";
  import createLinkState from "../../state/create-link.svelte";

  // UI local state
  let selectedAddress: string | null = $state(
    createLinkState.data.tipLink?.asset ?? null,
  );
  let amountStr: string = $state(
    createLinkState.data.tipLink?.amount?.toString() ?? "",
  );

  // effect to update the store
  $effect(() => {
    if (selectedAddress && amountStr) {
      const n = Number(amountStr);
      if (!Number.isNaN(n) && n > 0) {
        // TODO: convert amount to e8s based on token decimals
        createLinkState.data.tipLink = { asset: selectedAddress, amount: n };
        return;
      }
    }

    // Clear tipLink when selection/amount is invalid or missing
    createLinkState.data.tipLink = undefined;
  });
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
</div>
