<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { formatBalanceUnits } from "$modules/shared/utils/converter";
  import {
    formatUsdAmount,
    formatNumber,
  } from "$modules/shared/utils/formatNumber";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { maxAmountForAsset } from "$modules/links/utils/amountCalculator";
  import { locale } from "$lib/i18n";
  import AssetButton from "./AssetButton.svelte";
  import SelectedAssetButtonInfo from "./SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "../shared/TokenSelectorDrawer.svelte";
  import { toast } from "svelte-sonner";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let showAssetDrawer = $state(false);
  let localTokenAmount = $state("");
  let localUsdAmount = $state("");
  let isUsd = $state(false);

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

  let selectedAddress: string | undefined = $derived.by(() => {
    const assets = link.createLinkData?.assets;
    if (assets && assets.length > 0) return assets[0].address;
    return undefined;
  });

  let selectedToken: TokenWithPriceAndBalance | null = $derived.by(() => {
    if (!selectedAddress || !walletStore.query.data) return null;

    const token = walletStore.findTokenByAddress(selectedAddress);
    if (token.isErr()) return null;
    return token.unwrap();
  });

  const tokenUsdPrice = $derived.by(() => {
    return selectedToken?.priceUSD;
  });

  const canConvert = $derived.by(() => {
    return tokenUsdPrice !== undefined && tokenUsdPrice > 0;
  });

  const decimals = $derived.by(() => {
    return selectedToken?.decimals || 8;
  });

  // Track previous token address and amount to detect changes
  let previousTokenAddress = $state<string | undefined>(undefined);
  let previousUseAmount = $state<bigint | undefined>(undefined);

  // Sync form amount with local state and handle token changes
  $effect(() => {
    const currentAddress = selectedToken?.address;
    const asset = link.createLinkData.assets[0];
    const currentUseAmount = asset?.useAmount;

    const addressChanged =
      currentAddress && currentAddress !== previousTokenAddress;
    const amountChanged =
      currentUseAmount !== undefined && currentUseAmount !== previousUseAmount;

    if (addressChanged) {
      localTokenAmount = "";
      localUsdAmount = "";
      previousTokenAddress = currentAddress;
      previousUseAmount = currentUseAmount;
    } else if (!currentAddress) {
      previousTokenAddress = undefined;
      previousUseAmount = undefined;
    }

    if (selectedToken && link.createLinkData.assets.length > 0 && asset) {
      if (asset.useAmount !== undefined && asset.useAmount !== 0n) {
        const tokenAmountNumber = parseBalanceUnits(asset.useAmount, decimals);

        if (tokenAmountNumber > 0) {
          // Only update if we're not in USD mode (to avoid overwriting user input)
          if (
            addressChanged ||
            amountChanged ||
            (previousUseAmount === undefined && !isUsd)
          ) {
            localTokenAmount = tokenAmountNumber.toString();

            if (canConvert && tokenUsdPrice) {
              const usdValue = tokenAmountNumber * tokenUsdPrice;
              // Round to 4 decimal places to avoid floating point precision errors
              const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
              localUsdAmount = formatUsdAmount(roundedUsdValue);
            }
          }
        }
      } else if (asset.useAmount === 0n && addressChanged) {
        localTokenAmount = "";
        localUsdAmount = "";
      }

      if (!addressChanged) {
        previousUseAmount = currentUseAmount;
      }
    }
  });

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
    showAssetDrawer = false;
  }

  function handleAmountChange(value: string) {
    if (isUsd) {
      localUsdAmount = value;

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const tokenValue = parseFloat(value) / tokenUsdPrice;
        localTokenAmount = tokenValue.toString();
        setUsdAmount(value);
      } else {
        setUsdAmount(value);
      }
    } else {
      localTokenAmount = value;

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const usdValue = parseFloat(value) * tokenUsdPrice;
        // Round to 4 decimal places to avoid floating point precision errors
        const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
        localUsdAmount = formatUsdAmount(roundedUsdValue);
        setTokenAmount(value);
      } else {
        setTokenAmount(value);
      }
    }
  }

  function setTokenAmount(value: string) {
    if (!selectedToken) return;

    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      link.createLinkData = {
        ...link.createLinkData,
        assets: [
          {
            address: selectedToken.address,
            useAmount: 0n,
          },
        ],
      };
      return;
    }

    const amount = formatBalanceUnits(num, decimals);
    link.createLinkData = {
      ...link.createLinkData,
      assets: [
        {
          address: selectedToken.address,
          useAmount: amount,
        },
      ],
    };
  }

  function setUsdAmount(value: string) {
    if (!selectedToken || !canConvert || !tokenUsdPrice) return;

    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      link.createLinkData = {
        ...link.createLinkData,
        assets: [
          {
            address: selectedToken.address,
            useAmount: 0n,
          },
        ],
      };
      return;
    }

    const tokenValue = num / tokenUsdPrice;
    const amount = formatBalanceUnits(tokenValue, decimals);
    link.createLinkData = {
      ...link.createLinkData,
      assets: [
        {
          address: selectedToken.address,
          useAmount: amount,
        },
      ],
    };
  }

  function handleToggleUsd(value: boolean) {
    isUsd = value;
  }

  function handleMaxClick() {
    if (!selectedToken || !walletStore.query.data) return;

    // Calculate max amount with fee consideration
    const maxAmountResult = maxAmountForAsset(
      selectedToken.address,
      link.createLinkData.maxUse,
      walletStore.query.data,
    );

    if (maxAmountResult.isErr()) {
      console.error("Failed to calculate max amount:", maxAmountResult.error);
      toast.error("Failed to calculate maximum amount");
      return;
    }

    const maxAmountBigInt = maxAmountResult.unwrap();
    const maxTokenAmount = parseBalanceUnits(maxAmountBigInt, decimals);

    localTokenAmount = maxTokenAmount.toString();

    if (canConvert && tokenUsdPrice) {
      const usdValue = maxTokenAmount * tokenUsdPrice;
      // Round to 4 decimal places to avoid floating point precision errors
      const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
      localUsdAmount = formatUsdAmount(roundedUsdValue);
    }

    setTokenAmount(maxTokenAmount.toString());
  }

  const USD_AMOUNT_PRESETS = [1, 2, 5];

  // Calculate max available USD balance with fee consideration
  const maxUsdBalance = $derived.by(() => {
    if (
      !selectedToken ||
      !canConvert ||
      !tokenUsdPrice ||
      !walletStore.query.data
    )
      return 0;

    const maxAmountResult = maxAmountForAsset(
      selectedToken.address,
      link.createLinkData.maxUse,
      walletStore.query.data,
    );

    if (maxAmountResult.isErr()) {
      // Fallback to balance without fee if calculation fails
      const tokenBalance = parseBalanceUnits(selectedToken.balance, decimals);
      return tokenBalance * tokenUsdPrice;
    }

    const maxAmountBigInt = maxAmountResult.unwrap();
    const maxTokenAmount = parseBalanceUnits(maxAmountBigInt, decimals);
    return maxTokenAmount * tokenUsdPrice;
  });

  function isUsdAmountAvailable(usdAmount: number): boolean {
    return maxUsdBalance >= usdAmount;
  }

  function handleUsdPreset(usdAmount: number) {
    if (!selectedToken || !canConvert || !tokenUsdPrice) return;

    if (!isUsdAmountAvailable(usdAmount)) return;

    const tokenAmountNeeded = usdAmount / tokenUsdPrice;
    // Format token amount to avoid excessive decimal places
    const formattedTokenAmount = formatNumber(tokenAmountNeeded, {
      tofixed: 8,
    });

    localTokenAmount = formattedTokenAmount;
    localUsdAmount = formatUsdAmount(usdAmount);
    setTokenAmount(formattedTokenAmount);
  }

  // Navigate to next Preview step
  async function goNext() {
    try {
      await link.goNext();
    } catch (e) {
      // Error is already formatted in the state, just show it
      toast.error(String(e));
    }
  }
</script>

<div class="space-y-4 relative grow-1 flex flex-col mt-2 sm:mt-0">
  <div class="input-label-field-container space-y-1">
    <div class="flex w-full items-center">
      <Label>{locale.t("links.linkForm.addAsset.asset")}</Label>
      {#if selectedToken}
        <button
          onclick={handleMaxClick}
          class="ml-auto text-[#36A18B] text-[12px] font-medium cursor-pointer"
        >
          {locale.t("links.linkForm.addAsset.max")}
        </button>
      {/if}
    </div>

    <div>
      <AssetButton
        text={locale.t("links.linkForm.addAsset.chooseAsset")}
        tokenValue={localTokenAmount}
        usdValue={localUsdAmount}
        onInputChange={handleAmountChange}
        {isUsd}
        onToggleUsd={handleToggleUsd}
        token={selectedToken}
        {canConvert}
        tokenDecimals={decimals}
        maxUse={link.createLinkData.maxUse}
        walletTokens={walletStore.query.data || []}
      >
        {#if selectedToken}
          <SelectedAssetButtonInfo
            {selectedToken}
            onOpenDrawer={() => (showAssetDrawer = true)}
          />
        {/if}
      </AssetButton>

      <TokenSelectorDrawer
        bind:open={showAssetDrawer}
        {selectedAddress}
        onSelectToken={handleSelectToken}
      />
    </div>

    {#if selectedToken && canConvert && tokenUsdPrice}
      <div class="flex justify-between items-center gap-2 mt-6">
        {#each USD_AMOUNT_PRESETS as usdAmount, key (key)}
          {@const isDisabled = !isUsdAmountAvailable(usdAmount)}
          <button
            type="button"
            onclick={() => handleUsdPreset(usdAmount)}
            disabled={isDisabled}
            class="flex-1 px-3 py-6 text-sm font-medium rounded-md border transition-colors {isDisabled
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 cursor-pointer hover:bg-gray-50 hover:border-[#36A18B] hover:text-[#36A18B]'}"
          >
            {usdAmount} USD
          </button>
        {/each}
      </div>
    {/if}
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
