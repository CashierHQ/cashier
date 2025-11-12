<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import InputAmount from "../inputAmount/inputAmount.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  // Error message state
  let errorMessage: string | null = $state(null);

  // Auto-select the first token when wallet data becomes available and assets are empty
  $effect(() => {
    if (
      walletStore.query.data &&
      walletStore.query.data.length > 0 &&
      link.createLinkData.assets.length === 0
    ) {
      link.createLinkData = {
        ...link.createLinkData,
        assets: [
          {
            address: walletStore.query.data[0].address,
            useAmount: 0n,
          },
        ],
      };
    }
  });

  // read-only derived state for the selected asset address
  let selectedAddress: string | undefined = $derived.by(() => {
    const assets = link.createLinkData?.assets;
    if (assets && assets.length > 0) return assets[0].address;
    return undefined;
  });

  // read-only derived state for the selected token
  let selectedToken: TokenWithPriceAndBalance | null = $derived.by(() => {
    if (!selectedAddress || !walletStore.query.data) return null;

    const token = walletStore.findTokenByAddress(selectedAddress);
    if (token.isErr()) return null;
    return token.unwrap();
  });

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.ADD_ASSET) {
      goto(resolve("/app"));
    }
  });

  // Handle asset selection
  function handleSelectToken(address: string) {
    link.createLinkData = {
      ...link.createLinkData,
      assets: [
        {
          address,
          useAmount: 0n,
        },
      ],
    };
  }

  // Navigate back to previous ChooseLinkType step
  function goBack() {
    errorMessage = null;
    try {
      link.goBack();
    } catch (e) {
      errorMessage = "Failed to go back to previous step: " + e;
    }
  }

  // Navigate to next Preview step
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
              onclick={() => handleSelectToken(token.address)}
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
    {#if link.createLinkData.assets.length > 0 && selectedToken}
      <InputAmount
        bind:tokenAmount={link.createLinkData.assets[0].useAmount}
        token={selectedToken}
      />
    {/if}
  </div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}

  <Button onclick={goBack}>Back</Button>
  <Button onclick={goNext}>Next</Button>
</div>
