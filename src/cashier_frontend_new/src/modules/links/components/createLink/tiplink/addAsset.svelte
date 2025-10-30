<script lang="ts">
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkStore } from "$modules/links/state/linkStore.svelte";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import UsdShortcutButton from "./UsdShortcutButton.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import InputAmount from "../inputAmount/inputAmount.svelte";
  import { CreateLinkAsset } from "$modules/links/types/createLinkData";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  // UI local state — initialize from first asset if present
  let selectedAddress: string | null = $state(
    link.createLinkData?.assets && link.createLinkData.assets.length > 0
      ? link.createLinkData.assets[0].address
      : null,
  );

  let amountBaseUnits: bigint = $state(
    link.createLinkData?.assets && link.createLinkData.assets.length > 0
      ? link.createLinkData.assets[0].useAmount
      : 0n,
  );
  let mode = $state<"amount" | "usd">("amount");

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
  let selectedTokenState = $derived.by(() => getSelectedToken());

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
              onclick={() => {
                selectedAddress = token.address;
                amountBaseUnits = 0n;
              }}
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
        bind:mode
        decimals={selectedTokenState?.decimals}
        priceUsd={selectedTokenState?.priceUSD ?? undefined}
        balance={selectedTokenState?.balance}
        symbol={selectedTokenState?.symbol ?? "N/A"}
        ledgerFee={selectedTokenState?.fee}
      />

      <UsdShortcutButton
        bind:value={amountBaseUnits}
        bind:mode
        usd={1}
        decimals={selectedTokenState?.decimals}
        priceUsd={selectedTokenState?.priceUSD}
      />

      <UsdShortcutButton
        bind:value={amountBaseUnits}
        bind:mode
        usd={5}
        decimals={selectedTokenState?.decimals}
        priceUsd={selectedTokenState?.priceUSD}
      />

      <UsdShortcutButton
        bind:value={amountBaseUnits}
        bind:mode
        usd={10}
        decimals={selectedTokenState?.decimals}
        priceUsd={selectedTokenState?.priceUSD}
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
