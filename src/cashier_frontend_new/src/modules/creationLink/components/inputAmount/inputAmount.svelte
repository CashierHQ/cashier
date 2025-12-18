<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { locale } from "$lib/i18n";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import AssetButton from "$modules/creationLink/components/tiplink/AssetButton.svelte";
  import SelectedAssetButtonInfo from "$modules/creationLink/components/tiplink/SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";

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

  const tokenUsdPrice = $derived.by(() => {
    return selectedTokenObj?.priceUSD;
  });

  const canConvert = $derived.by(() => {
    return tokenUsdPrice !== undefined && tokenUsdPrice > 0;
  });

  // Синхронізуємо локальні значення з зовнішніми
  $effect(() => {
    tokenAmount = localTokenAmount;
  });

  $effect(() => {
    usdAmount = localUsdAmount;
  });

  $effect(() => {
    if (localTokenAmount) {
      const num = parseFloat(localTokenAmount);
      if (!isNaN(num) && num > 0) {
        amount = num;
      } else {
        amount = 0;
      }
    } else {
      amount = 0;
    }
  });

  $effect(() => {
    if (selectedTokenObj && localTokenAmount === "") {
      localTokenAmount = "";
      localUsdAmount = "";
      amount = 0;
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

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const tokenValue = parseFloat(value) / tokenUsdPrice;
        localTokenAmount = tokenValue.toString();
      } else {
        localTokenAmount = "";
      }
    } else {
      localTokenAmount = value;

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const usdValue = parseFloat(value) * tokenUsdPrice;
        const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
        localUsdAmount = formatUsdAmount(roundedUsdValue);
      } else {
        localUsdAmount = "";
      }
    }
  }

  function handleToggleUsd(value: boolean) {
    isUsd = value;
  }

  function handleMaxClick() {
    if (!isMaxAvailable || !selectedTokenObj) return;
    amount = maxAmount;
    localTokenAmount = maxAmount.toString();

    if (canConvert && tokenUsdPrice) {
      const usdValue = maxAmount * tokenUsdPrice;
      const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
      localUsdAmount = formatUsdAmount(roundedUsdValue);
    }
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
