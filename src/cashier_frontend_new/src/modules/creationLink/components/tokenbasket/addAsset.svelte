<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import {
    parseBalanceUnits,
    formatBalanceUnits,
  } from "$modules/shared/utils/converter";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import {
    calculateMaxSendAmount,
    calculateRequiredAssetAmount,
  } from "$modules/links/utils/amountCalculator";
  import { locale } from "$lib/i18n";
  import AssetButton from "$modules/creationLink/components/shared/AssetButton.svelte";
  import SelectedAssetButtonInfo from "$modules/creationLink/components/shared/SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import { toast } from "svelte-sonner";
  import { Plus, Trash2 } from "lucide-svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let showAssetDrawer = $state(false);
  let selectedAssetIndex = $state<number | null>(null);
  // Track display mode (token vs USD) for each asset
  let isUsdStates = $state<boolean[]>([]);

  function getFirstUnusedTokenAddress(): string | null {
    if (!walletStore.query.data || walletStore.query.data.length === 0) {
      return null;
    }

    const allTokenAddresses = walletStore.query.data.map(
      (token) => token.address,
    );
    const usedAddresses = new Set(
      link.createLinkData.assets.map((asset) => asset.address),
    );

    const unused = allTokenAddresses.find(
      (address) => !usedAddresses.has(address),
    );

    // If everything is used (should not happen when canAddMoreAssets is true),
    // fallback to the first token address
    return unused ?? allTokenAddresses[0] ?? null;
  }

  // Auto-add first token when wallet data becomes available and assets are empty
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

  function handleAddAsset() {
    if (!walletStore.query.data || walletStore.query.data.length === 0) {
      return;
    }

    const address = getFirstUnusedTokenAddress();
    if (!address) return;

    const newAsset = {
      address,
      useAmount: 0n,
    };

    link.createLinkData = {
      ...link.createLinkData,
      assets: [...link.createLinkData.assets, newAsset],
    };
  }

  function handleRemoveAsset(index: number) {
    const newAssets = link.createLinkData.assets.filter((_, i) => i !== index);
    link.createLinkData = {
      ...link.createLinkData,
      assets: newAssets,
    };

    const nextStates = [...isUsdStates];
    nextStates.splice(index, 1);
    isUsdStates = nextStates;
  }

  function handleSelectToken(address: string, index: number) {
    const newAssets = [...link.createLinkData.assets];
    newAssets[index] = {
      address,
      useAmount: newAssets[index]?.useAmount || 0n,
    };
    link.createLinkData = {
      ...link.createLinkData,
      assets: newAssets,
    };
    showAssetDrawer = false;
    selectedAssetIndex = null;
  }

  function getExcludedAddressesForIndex(index: number): string[] {
    const currentAddress = link.createLinkData.assets[index]?.address;

    const addresses = link.createLinkData.assets
      .map((asset) => asset.address)
      .filter((address) => address && address !== currentAddress);

    // unique addresses
    return Array.from(new Set(addresses));
  }

  function handleAmountChange(value: string, index: number) {
    const num = parseFloat(value);

    const tokenResult = walletStore.findTokenByAddress(
      link.createLinkData.assets[index].address,
    );
    if (tokenResult.isErr()) return;

    const token = tokenResult.unwrap();
    const decimals = token.decimals || 8;

    // If input is invalid or non-positive, reset amount
    if (isNaN(num) || num <= 0) {
      const newAssets = [...link.createLinkData.assets];
      newAssets[index] = {
        ...newAssets[index],
        useAmount: 0n,
      };
      link.createLinkData = {
        ...link.createLinkData,
        assets: newAssets,
      };
      return;
    }

    // Determine whether current value is in USD or token units
    const isUsd = isUsdStates[index] ?? false;

    let tokenAmountNumber: number = num;

    // Convert from USD to token units if needed and price data is available
    if (isUsd && token.priceUSD && token.priceUSD > 0) {
      tokenAmountNumber = num / token.priceUSD;
    }

    const amount = formatBalanceUnits(tokenAmountNumber, decimals);

    const newAssets = [...link.createLinkData.assets];
    newAssets[index] = {
      ...newAssets[index],
      useAmount: amount,
    };
    link.createLinkData = {
      ...link.createLinkData,
      assets: newAssets,
    };
  }

  function handleToggleUsd(value: boolean, index: number) {
    const nextStates = [...isUsdStates];
    nextStates[index] = value;
    isUsdStates = nextStates;
  }

  function getTokenForAsset(index: number): TokenWithPriceAndBalance | null {
    const asset = link.createLinkData.assets[index];
    if (!asset || !walletStore.query.data) return null;

    const token = walletStore.findTokenByAddress(asset.address);
    if (token.isErr()) return null;
    return token.unwrap();
  }

  function getAmountForAsset(index: number): string {
    const asset = link.createLinkData.assets[index];
    if (!asset || asset.useAmount === 0n) return "";

    const token = getTokenForAsset(index);
    if (!token || !walletStore.query.data) return "";

    // Calculate total amount using calculateRequiredAssetAmount for link calculation
    const requiredAmountResult = calculateRequiredAssetAmount(
      [asset],
      link.createLinkData.maxUse,
      walletStore.query.data,
    );

    if (requiredAmountResult.isErr()) return "";

    const requiredAmounts = requiredAmountResult.unwrap();
    const requiredAmount = requiredAmounts[asset.address] || 0n;

    // Subtract fees to get the total amount without fees (useAmount * maxUse)
    // requiredAmount = (useAmount * maxUse) + fee * (1 + maxUse)
    // So: useAmount * maxUse = requiredAmount - fee * (1 + maxUse)
    const fees = token.fee * (BigInt(1) + BigInt(link.createLinkData.maxUse));
    const totalAmount = requiredAmount - fees;

    if (totalAmount <= 0n) return "";

    const decimals = token.decimals || 8;
    return parseBalanceUnits(totalAmount, decimals).toString();
  }

  // Calculate max available token balance for a specific asset (for token basket, no maxUse)
  function getMaxTokenBalance(index: number): number {
    const token = getTokenForAsset(index);
    if (!token || !walletStore.query.data) return 0;

    const maxAmountResult = calculateMaxSendAmount(
      token.address,
      walletStore.query.data,
    );

    if (maxAmountResult.isErr()) {
      return 0;
    }

    const maxAmountBigInt = maxAmountResult.unwrap();
    const decimals = token.decimals || 8;
    return parseBalanceUnits(maxAmountBigInt, decimals);
  }

  // Check if max balance is available for a specific asset
  function isMaxAvailable(index: number): boolean {
    const token = getTokenForAsset(index);
    if (!token) return false;

    const maxBalance = getMaxTokenBalance(index);
    return isFinite(maxBalance) && maxBalance > 0;
  }

  function handleMaxClick(index: number) {
    const token = getTokenForAsset(index);
    if (!token || !walletStore.query.data) return;

    const maxBalance = getMaxTokenBalance(index);
    if (!isMaxAvailable(index)) {
      return;
    }

    const decimals = token.decimals || 8;
    const maxTokenAmount = maxBalance;

    // Update the amount for this asset
    const amount = formatBalanceUnits(maxTokenAmount, decimals);

    const newAssets = [...link.createLinkData.assets];
    newAssets[index] = {
      ...newAssets[index],
      useAmount: amount,
    };
    link.createLinkData = {
      ...link.createLinkData,
      assets: newAssets,
    };
  }

  function canAddMoreAssets(): boolean {
    if (!walletStore.query.data) return false;

    const allTokenAddresses = walletStore.query.data.map(
      (token) => token.address,
    );
    const uniqueWalletAddresses = new Set(allTokenAddresses);

    const usedAddresses = new Set(
      link.createLinkData.assets.map((asset) => asset.address),
    );

    return usedAddresses.size < uniqueWalletAddresses.size;
  }

  // Navigate to next Preview step
  async function goNext() {
    try {
      await link.goNext();
    } catch (e) {
      toast.error(String(e));
    }
  }
</script>

<div class="space-y-4 relative grow-1 flex flex-col mt-2 sm:mt-0">
  <div class="input-label-field-container space-y-4">
    <!-- eslint-disable-next-line @typescript-eslint/no-unused-vars -->
    {#each link.createLinkData.assets as _asset, index (index)}
      {@const token = getTokenForAsset(index)}
      {@const amount = getAmountForAsset(index)}
      {@const usdAmount =
        token && token.priceUSD && amount
          ? formatUsdAmount(parseFloat(amount || "0") * token.priceUSD)
          : ""}

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Label class="text-sm">
              {locale.t("links.linkForm.addAsset.asset")}
              {index + 1}
            </Label>
            <button
              type="button"
              onclick={() => handleRemoveAsset(index)}
              class="text-primary hover:text-primary/80 transition-colors cursor-pointer"
              aria-label="Remove asset"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
          {#if token}
            <button
              onclick={() => handleMaxClick(index)}
              disabled={!isMaxAvailable(index)}
              class="ml-auto text-[12px] font-medium transition-colors {isMaxAvailable(
                index,
              )
                ? 'text-[#36A18B] cursor-pointer hover:text-[#2d8a75]'
                : 'text-gray-400 cursor-not-allowed'}"
            >
              {locale.t("links.linkForm.addAsset.max")}
            </button>
          {/if}
        </div>

        <div>
          <AssetButton
            text={locale.t("links.linkForm.addAsset.chooseAsset")}
            tokenValue={amount}
            usdValue={usdAmount}
            onInputChange={(value) => handleAmountChange(value, index)}
            isUsd={isUsdStates[index] ?? false}
            onToggleUsd={(value) => handleToggleUsd(value, index)}
            token={token ?? null}
            canConvert={token
              ? Boolean(token.priceUSD && token.priceUSD > 0)
              : false}
            maxBalanceWithFee={getMaxTokenBalance(index)}
            showInput={true}
          >
            {#if token}
              <SelectedAssetButtonInfo
                selectedToken={token}
                onOpenDrawer={() => {
                  selectedAssetIndex = index;
                  showAssetDrawer = true;
                }}
              />
            {/if}
          </AssetButton>
        </div>
      </div>
    {/each}

    {#if canAddMoreAssets()}
      <button
        type="button"
        onclick={handleAddAsset}
        class="w-full border-2 border border-lightgreen cursor-pointer rounded-lg mt-6 py-8 px-6 flex flex-col items-center justify-center gap-2 text-green hover:bg-lightgreen transition-colors"
      >
        <div
          class="bg-primary rounded-full h-[44px] w-[44px] aspect-square flex items-center justify-center"
        >
          <Plus class="w-6 h-6 text-white" />
        </div>
        <span class="text-primary text-[14px] font-semibold"
          >{locale.t("links.linkForm.addAsset.addAsset")}</span
        >
      </button>
    {/if}

    <TokenSelectorDrawer
      bind:open={showAssetDrawer}
      selectedAddress={selectedAssetIndex !== null
        ? link.createLinkData.assets[selectedAssetIndex]?.address
        : undefined}
      excludeAddresses={selectedAssetIndex !== null
        ? getExcludedAddressesForIndex(selectedAssetIndex)
        : []}
      onSelectToken={(address) => {
        if (selectedAssetIndex !== null) {
          handleSelectToken(address, selectedAssetIndex);
        }
      }}
    />
  </div>

  <div
    class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
  >
    <Button
      onclick={goNext}
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      type="button"
    >
      {locale.t("links.linkForm.chooseType.continue")}
    </Button>
  </div>
</div>
