<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import AssetButton from "$modules/creationLink/components/shared/AssetButton.svelte";
  import SelectedAssetButtonInfo from "$modules/creationLink/components/shared/SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import {
    convertUsdToToken,
    convertTokenToUsd,
    parseTokenAmount,
  } from "$modules/links/utils/amountConversion";

  interface Props {
    selectedToken: string;
    selectedTokenObj: TokenWithPriceAndBalance | null;
    maxAmount: number;
    amount?: number;
    tokenAmount?: string;
    usdAmount?: string;
    isMaxAvailable?: boolean;
    onSelectToken: (address: string) => void;
    label?: string;
  }

  let {
    selectedToken = $bindable(),
    selectedTokenObj,
    maxAmount,
    amount = $bindable(0),
    tokenAmount = $bindable(""),
    usdAmount = $bindable(""),
    isMaxAvailable = true,
    onSelectToken,
    label = locale.t("wallet.send.selectTokenLabel"),
  }: Props = $props();

  let showAssetDrawer = $state(false);
  let localTokenAmount = $state("");
  let localUsdAmount = $state("");
  let isUsd = $state(false);

  const tokenUsdPrice = $derived(selectedTokenObj?.priceUSD);
  const canConvert = $derived(tokenUsdPrice !== undefined && tokenUsdPrice > 0);

  // Sync local values with external bindable props
  $effect(() => {
    tokenAmount = localTokenAmount;
    usdAmount = localUsdAmount;
    amount = parseTokenAmount(localTokenAmount);
  });

  // Sync external reset back to local (when parent resets values)
  $effect(() => {
    if (amount === 0 && localTokenAmount !== "") {
      localTokenAmount = "";
      localUsdAmount = "";
    }
  });

  // Track previous token address to detect actual token changes (not just object updates)
  let previousTokenAddress = $state<string | null>(null);

  $effect(() => {
    const currentTokenAddress = selectedTokenObj?.address;

    // Only reset values when token address actually changes, not when object is refreshed
    if (currentTokenAddress && currentTokenAddress !== previousTokenAddress) {
      localTokenAmount = "";
      localUsdAmount = "";
      amount = 0;
      previousTokenAddress = currentTokenAddress;
    } else if (!currentTokenAddress) {
      previousTokenAddress = null;
    }
  });

  function handleSelectToken(address: string) {
    selectedToken = address;
    onSelectToken(address);
    showAssetDrawer = false;
  }

  function handleAmountChange(value: string) {
    if (isUsd) {
      localUsdAmount = value;
      localTokenAmount = convertUsdToToken(value, tokenUsdPrice);
    } else {
      localTokenAmount = value;
      localUsdAmount = convertTokenToUsd(value, tokenUsdPrice);
    }
  }

  function handleToggleUsd(value: boolean) {
    isUsd = value;
  }

  function handleMaxClick() {
    if (!isMaxAvailable || !selectedTokenObj) return;
    amount = maxAmount;
    localTokenAmount = maxAmount.toString();
    localUsdAmount = convertTokenToUsd(maxAmount, tokenUsdPrice);
  }
</script>

<div class="input-label-field-container space-y-1">
  <div class="flex w-full items-center">
    <Label>{label}</Label>
    {#if selectedTokenObj}
      <button
        onclick={handleMaxClick}
        disabled={!isMaxAvailable}
        class="ml-auto text-[12px] font-medium transition-colors {isMaxAvailable
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
      tokenValue={localTokenAmount}
      usdValue={localUsdAmount}
      onInputChange={handleAmountChange}
      {isUsd}
      onToggleUsd={handleToggleUsd}
      token={selectedTokenObj}
      {canConvert}
      maxBalanceWithFee={maxAmount}
    >
      {#if selectedTokenObj}
        <SelectedAssetButtonInfo
          selectedToken={selectedTokenObj}
          onOpenDrawer={() => (showAssetDrawer = true)}
        />
      {/if}
    </AssetButton>

    <TokenSelectorDrawer
      bind:open={showAssetDrawer}
      selectedAddress={selectedToken}
      onSelectToken={handleSelectToken}
    />
  </div>
</div>
