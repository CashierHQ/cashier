<script lang="ts">
  import { resolve } from "$app/paths";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";

  const {
    link,
    errorMessage,
    successMessage,
  }: {
    link: LinkCreationStore;
    errorMessage: string | null;
    successMessage: string | null;
  } = $props();

  let amountPerAsset = $derived.by(() => {
    if (
      !link.createLinkData.assets ||
      link.createLinkData.assets.length === 0
    ) {
      return null;
    }

    const amountPerAsset: Record<string, number> = {};

    for (const assetInfo of link.createLinkData.assets) {
      const tokenResult = walletStore.findTokenByAddress(assetInfo.address);
      if (tokenResult.isErr()) {
        continue;
      }
      const token = tokenResult.unwrap();

      const amount = parseBalanceUnits(assetInfo.useAmount, token.decimals);
      amountPerAsset[assetInfo.address] = amount;
    }

    return amountPerAsset;
  });
</script>

<div>
  <div><strong>Title:</strong> {link.createLinkData.title}</div>
  <div>
    <strong>Link Type:</strong>
    {link.createLinkData.linkType}
  </div>
  {#if link.createLinkData.assets}
    {#each link.createLinkData.assets as assetInfo (assetInfo.address)}
      {#if amountPerAsset}
        <div class="mt-2 p-2 border rounded">
          <div><strong>Asset:</strong> {assetInfo.address}</div>
          <div>
            <strong>Amount per use action:</strong>
            {amountPerAsset[assetInfo.address]}
          </div>
        </div>
      {/if}
    {/each}
  {/if}

  <br />

  <div><strong>Link creation fee</strong></div>
  <div><strong>Amount:</strong> {0.003}</div>

  {#if errorMessage}
    <div class="text-red-600">{errorMessage}</div>
  {/if}
  {#if successMessage}
    <div class="text-green-600">{successMessage}</div>
  {/if}

  {#if link?.id}
    <div class="mt-2">
      <strong>Your link:</strong>
      <div class="break-all text-blue-600">
        {resolve("/link/")}{link.id}
      </div>
    </div>
  {/if}
</div>
