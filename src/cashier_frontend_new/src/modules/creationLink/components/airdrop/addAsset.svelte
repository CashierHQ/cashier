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
  import { calculateMaxAmountForAsset } from "$modules/links/utils/amountCalculator";
  import { validationService } from "$modules/links/services/validationService";
  import { locale } from "$lib/i18n";
  import AssetButton from "$modules/creationLink/components/shared/AssetButton.svelte";
  import SelectedAssetButtonInfo from "$modules/creationLink/components/shared/SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import { toast } from "svelte-sonner";
  import { Minus, Plus } from "lucide-svelte";
  import { syncAssetFormState } from "$modules/creationLink/utils/syncAssetFormState";
  import { validateTotalAmount } from "$modules/creationLink/utils/validateTotalAmount";
  import { convertUsdToToken } from "$modules/creationLink/utils/convertUsdToToken";

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

  const tokenUsdPrice = $derived(selectedToken?.priceUSD);

  const canConvert = $derived(tokenUsdPrice !== undefined && tokenUsdPrice > 0);

  const decimals = $derived(selectedToken?.decimals || 8);

  // Track previous token address and amount to detect changes
  let previousTokenAddress = $state<string | undefined>(undefined);
  let previousUseAmount = $state<bigint | undefined>(undefined);

  // Sync form amount with local state and handle token changes
  $effect(() => {
    const currentAddress = selectedToken?.address;
    const asset = link.createLinkData.assets[0];
    const currentUseAmount = asset?.useAmount;

    const addressChanged = Boolean(
      currentAddress && currentAddress !== previousTokenAddress,
    );
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
      const syncResult = syncAssetFormState({
        assetUseAmount: asset.useAmount,
        decimals: decimals,
        tokenUsdPrice: tokenUsdPrice,
        canConvert: canConvert,
        addressChanged,
        amountChanged,
        previousUseAmount,
        isUsd,
      });

      if (syncResult.shouldUpdate) {
        localTokenAmount = syncResult.localTokenAmount;
        localUsdAmount = syncResult.localUsdAmount;
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

  function handleAmountChange(value: string, forceUpdate = false) {
    if (isUsd) {
      localUsdAmount = value;

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const tokenValue = convertUsdToToken(parseFloat(value), tokenUsdPrice);
        localTokenAmount = tokenValue.toString();
        setUsdAmount(value);
      } else if (forceUpdate) {
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
      } else if (forceUpdate) {
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

    // Validate total amount (perUse * maxUse) doesn't exceed maxTotalAmount
    const uses = link.createLinkData.maxUse || 0;

    const validationResult = validateTotalAmount({
      perUseAmount: num,
      maxUse: uses,
      maxTotalAmount: maxTotalAmount,
    });

    if (validationResult.exceedsLimit) {
      // Adjust to max allowed per use
      const adjustedValue = validationResult.maxPerUse.toString();
      localTokenAmount = adjustedValue;

      if (canConvert && tokenUsdPrice) {
        const usdValue = validationResult.maxPerUse * tokenUsdPrice;
        const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
        localUsdAmount = formatUsdAmount(roundedUsdValue);
      }

      const amount = formatBalanceUnits(validationResult.maxPerUse, decimals);
      link.createLinkData = {
        ...link.createLinkData,
        assets: [
          {
            address: selectedToken.address,
            useAmount: amount,
          },
        ],
      };

      const message = locale
        .t("links.linkForm.addAsset.errors.insufficientBalance")
        .replace("{{required}}", formatNumber(validationResult.calculatedTotal))
        .replace("{{tokenSymbol}}", selectedToken.symbol)
        .replace("{{available}}", formatNumber(maxTotalAmount));
      toast.info(message, { duration: 3000 });
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

    const tokenValue = convertUsdToToken(num, tokenUsdPrice);

    // Validate total amount (perUse * maxUse) doesn't exceed maxTotalAmount
    const uses = link.createLinkData.maxUse || 0;
    const validationResult = validateTotalAmount({
      perUseAmount: tokenValue,
      maxUse: uses,
      maxTotalAmount: maxTotalAmount,
    });

    if (validationResult.exceedsLimit) {
      // Adjust to max allowed per use
      const maxPerUseUsd = validationResult.maxPerUse * tokenUsdPrice;
      localUsdAmount = formatUsdAmount(maxPerUseUsd);
      localTokenAmount = validationResult.maxPerUse.toString();

      const amount = formatBalanceUnits(validationResult.maxPerUse, decimals);
      link.createLinkData = {
        ...link.createLinkData,
        assets: [
          {
            address: selectedToken.address,
            useAmount: amount,
          },
        ],
      };

      const message = locale
        .t("links.linkForm.addAsset.errors.insufficientBalance")
        .replace("{{required}}", formatNumber(validationResult.calculatedTotal))
        .replace("{{tokenSymbol}}", selectedToken.symbol)
        .replace("{{available}}", formatNumber(maxTotalAmount));
      toast.info(message, { duration: 3000 });
      return;
    }

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

  // Calculate max available token balance with fee consideration
  const maxTokenBalance = $derived.by(() => {
    if (!selectedToken || !walletStore.query.data) return 0;

    const maxAmountResult = calculateMaxAmountForAsset(
      selectedToken.address,
      link.createLinkData.maxUse,
      walletStore.query.data,
    );

    if (maxAmountResult.isErr()) {
      return 0;
    }

    const maxAmountBigInt = maxAmountResult.unwrap();
    return parseBalanceUnits(maxAmountBigInt, decimals);
  });

  // Check if max balance is sufficient (greater than 0 and finite)
  const isMaxAvailable = $derived.by(() => {
    return (
      isFinite(maxTokenBalance) && maxTokenBalance > 0 && selectedToken !== null
    );
  });

  function handleMaxClick() {
    if (!selectedToken || !walletStore.query.data) return;

    // Don't proceed if balance is insufficient for fees
    if (!isMaxAvailable) {
      return;
    }

    const maxTokenAmount = maxTokenBalance;

    localTokenAmount = maxTokenAmount.toString();

    if (canConvert && tokenUsdPrice) {
      const usdValue = maxTokenAmount * tokenUsdPrice;
      // Round to 4 decimal places to avoid floating point precision errors
      const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
      localUsdAmount = formatUsdAmount(roundedUsdValue);
    }

    setTokenAmount(maxTokenAmount.toString());
  }

  // Total amount = useAmount * maxUse (derived from validationService.totalAssetAmount)
  // This ensures consistency with backend calculations and YouSendPreview
  const totalAmount = $derived.by(() => {
    const asset = link.createLinkData.assets[0];
    const uses = link.createLinkData.maxUse || 0;
    if (!asset || !selectedToken || uses <= 0) return 0;

    // Use validationService to get exact total amount (useAmount * maxUse)
    const totalAmountsResult = validationService.totalAssetAmount(
      link.createLinkData,
    );

    if (totalAmountsResult.isErr()) {
      return 0;
    }

    const totalAmounts = totalAmountsResult.unwrap();
    const totalAmountBigInt = totalAmounts[asset.address];

    if (totalAmountBigInt === undefined) {
      return 0;
    }

    return parseBalanceUnits(totalAmountBigInt, decimals);
  });

  // Calculate max total amount (max per use * uses)
  // maxTokenBalance uses calculateMaxAmountForAsset (same logic as validationService.maxAmountForAsset)
  const maxTotalAmount = $derived.by(() => {
    const uses = link.createLinkData.maxUse || 0;
    if (uses <= 0) return 0;
    return maxTokenBalance * uses;
  });

  // Check if total amount exceeds available balance
  const isTotalAmountValid = $derived.by(() => {
    if (!selectedToken || totalAmount <= 0) return true; // Allow empty/zero
    return totalAmount <= maxTotalAmount;
  });

  // Navigate to next Preview step
  async function goNext() {
    try {
      // Validate total amount before proceeding
      if (!isTotalAmountValid) {
        const maxTotal = maxTotalAmount;
        const tokenSymbol = selectedToken?.symbol || "";
        const message = locale
          .t("links.linkForm.addAsset.errors.insufficientBalance")
          .replace("{{required}}", formatNumber(totalAmount))
          .replace("{{tokenSymbol}}", tokenSymbol)
          .replace("{{available}}", formatNumber(maxTotal));
        toast.error(message);
        return;
      }

      handleAmountChange(isUsd ? localUsdAmount : localTokenAmount, true);

      // Validate required amounts using validationService
      const validationResult = validationService.validateRequiredAmount(
        link.createLinkData,
        walletStore.query.data || [],
      );

      if (validationResult.isErr()) {
        const errorMessage = validationResult.error.message;

        // Check if it's an insufficient amount error
        const insufficientAmountMatch = errorMessage.match(
          /Insufficient amount for asset ([^,]+), required: (\d+), available: (\d+)/,
        );

        if (insufficientAmountMatch && walletStore.query.data) {
          const [, address, requiredStr, availableStr] =
            insufficientAmountMatch;
          const required = BigInt(requiredStr);
          const available = BigInt(availableStr);

          // Find the token to get symbol and decimals
          const token = walletStore.query.data.find(
            (t) => t.address === address,
          );

          if (token) {
            const requiredAmount = parseBalanceUnits(required, token.decimals);
            const availableAmount = parseBalanceUnits(
              available,
              token.decimals,
            );

            // Format the error message using locale
            const template = locale.t(
              "links.linkForm.addAsset.errors.insufficientBalance",
            );
            const formattedMessage = template
              .replace("{{required}}", formatNumber(requiredAmount))
              .replace("{{tokenSymbol}}", token.symbol)
              .replace("{{available}}", formatNumber(availableAmount));

            toast.error(formattedMessage);
            return;
          }
        }

        // For other errors, show the original message
        toast.error(`Validation failed: ${errorMessage}`);
        return;
      }

      await link.goNext();
    } catch (e) {
      // Error is already formatted in the state, just show it
      toast.error(String(e));
    }
  }

  function handleDecreaseUses() {
    if (link.createLinkData.maxUse > 1) {
      link.createLinkData.maxUse = link.createLinkData.maxUse - 1;
    }
  }

  function handleIncreaseUses() {
    link.createLinkData.maxUse = link.createLinkData.maxUse + 1;
  }

  function handleMaxUseInput(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    const value = e.currentTarget.value;
    // Remove any non-digit characters
    const cleaned = value.replace(/[^0-9]/g, "");

    if (cleaned === "") {
      // Set to 1 if empty
      link.createLinkData.maxUse = 1;
      e.currentTarget.value = "1";
      return;
    }

    // Only allow positive integers
    const numValue = parseInt(cleaned, 10);
    if (isNaN(numValue) || numValue < 1) {
      link.createLinkData.maxUse = 1;
      e.currentTarget.value = "1";
    } else {
      link.createLinkData.maxUse = numValue;
    }
  }

  function handleMaxUseBlur(
    e: Event & { currentTarget: EventTarget & HTMLInputElement },
  ) {
    // Ensure value is valid integer on blur
    const numValue = parseInt(e.currentTarget.value, 10);
    if (isNaN(numValue) || numValue < 1) {
      link.createLinkData.maxUse = 1;
      e.currentTarget.value = "1";
    } else {
      link.createLinkData.maxUse = numValue;
      e.currentTarget.value = numValue.toString();
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
        bind:tokenValue={localTokenAmount}
        bind:usdValue={localUsdAmount}
        onInputChange={handleAmountChange}
        {isUsd}
        onToggleUsd={handleToggleUsd}
        token={selectedToken}
        {canConvert}
        maxBalanceWithFee={maxTokenBalance}
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

    <!-- Uses & Amount total row -->
    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="flex flex-col space-y-1.5">
        <Label>{locale.t("links.linkForm.addAsset.uses")}</Label>
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            onclick={handleDecreaseUses}
            disabled={link.createLinkData.maxUse <= 1}
            class="flex items-center justify-center cursor-pointer min-w-6 w-6 h-6 rounded-full bg-lightgreen disabled:bg-lightgreen disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200 text-gray-700 hover:bg-gray-200 focus:outline-none outline-none transition-colors"
            aria-label="Decrease uses"
          >
            <Minus
              class="w-3.5 h-3.5 {link.createLinkData.maxUse <= 1
                ? 'text-gray-400'
                : 'text-[#36A18B]'}"
            />
          </button>
          <input
            type="number"
            min="1"
            step="1"
            class="max-w-20 sm:max-w-24 rounded-md border border-gray-300 px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green focus:border-green [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            bind:value={link.createLinkData.maxUse}
            oninput={handleMaxUseInput}
            onblur={handleMaxUseBlur}
          />
          <button
            type="button"
            onclick={handleIncreaseUses}
            class="flex items-center justify-center min-w-6 w-6 h-6 cursor-pointer rounded-full bg-lightgreen text-gray-700 hover:bg-gray-200 focus:outline-none outline-none transition-colors"
            aria-label="Increase uses"
          >
            <Plus class="w-3.5 h-3.5 text-[#36A18B]" />
          </button>
        </div>
      </div>
      <div class="flex flex-col space-y-1.5">
        <Label>{locale.t("links.linkForm.addAsset.amountTotal")}</Label>
        <div
          class="w-full rounded-md px-3 py-2 border border-transparent text-sm flex items-center justify-between bg-lightgreen"
        >
          <span>
            {#if totalAmount > 0}
              {formatNumber(totalAmount, { tofixed: 8 })}
            {:else}
              0
            {/if}
          </span>
          {#if selectedToken}
            <span class="text-xs text-gray-500">{selectedToken.symbol}</span>
          {/if}
        </div>
      </div>
    </div>
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
