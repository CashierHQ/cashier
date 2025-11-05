<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkCreationStore } from "$modules/links/state/linkCreationStore.svelte";
  import { CreateLinkAsset } from "$modules/links/types/createLinkData";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import InputAmount from "../inputAmount/inputAmount.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  // UI local state
  // If there are assets already on the createLinkData, use the first one's values as defaults.
  // Otherwise default to undefined and 0n respectively.
  let selectedAddress: string | undefined = $state(
    (() => {
      const assets = link.createLinkData?.assets;
      if (assets && assets.length > 0) return assets[0].address;
      return undefined;
    })(),
  );

  let amountBaseUnits: bigint = $state(
    (() => {
      const assets = link.createLinkData?.assets;
      if (assets && assets.length > 0) return assets[0].useAmount ?? 0n;
      return 0n;
    })(),
  );

  // useAmount selected token metadata
  function getSelectedToken() {
    if (!selectedAddress || !walletStore.query.data || !selectedAddress)
      return null;
    return (
      walletStore.query.data.find(
        (token) => token.address === selectedAddress,
      ) || null
    );
  }

  // selected token state for template usage (derived from selection + wallet)
  let selectedTokenState = $derived(() => getSelectedToken());

  // Auto-select the first token when wallet data becomes available and nothing is selected
  $effect(() => {
    if (
      !selectedAddress &&
      walletStore.query.data &&
      walletStore.query.data.length > 0
    ) {
      selectedAddress = walletStore.query.data[0].address;
    }
  });

  // (conversion now handled by InputAmount component; addAsset uses base units)

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.ADD_ASSET) {
      goto(resolve("/"));
    }
  });

  // effect to update the store when selected asset or base units change
  $effect(() => {
    if (selectedAddress && amountBaseUnits && amountBaseUnits > 0) {
      link.createLinkData.assets = new Array(
        new CreateLinkAsset(selectedAddress, amountBaseUnits),
      );
      return;
    }
  });

  // ErruseAmountsage state
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
    {#if selectedTokenState}
      <InputAmount
        bind:value={amountBaseUnits}
        decimals={selectedTokenState()?.decimals ?? 8}
        priceUsd={selectedTokenState()?.priceUSD ?? undefined}
        balance={selectedTokenState()?.balance}
      />
    {:else}
      <Input id="amount" type="number" placeholder="0.00" disabled />
    {/if}
  </div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}

  <Button onclick={goBack}>Back</Button>

  <Button onclick={goNext}>Next</Button>
</div>
