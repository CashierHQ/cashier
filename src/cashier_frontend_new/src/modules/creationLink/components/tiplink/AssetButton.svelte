<script lang="ts">
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { maxAmountForAsset } from "$modules/links/utils/amountCalculator";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import UsdSwitch from "./UsdSwitch.svelte";
  import AmountActionButtons from "./AmountActionButtons.svelte";

  type PresetButton = {
    content: string;
    action: () => void;
  };

  type Props = {
    text: string;
    tokenValue?: string;
    usdValue?: string;
    onInputChange?: (value: string) => void;
    isUsd?: boolean;
    token?: TokenWithPriceAndBalance | null;
    onToggleUsd?: (value: boolean) => void;
    canConvert?: boolean;
    tokenDecimals?: number;
    showPresetButtons?: boolean;
    presetButtons?: PresetButton[];
    isDisabled?: boolean;
    showInput?: boolean;
    isTip?: boolean;
    maxUse?: number;
    walletTokens?: TokenWithPriceAndBalance[];
    children?: unknown;
  };

  let {
    text,
    children,
    tokenValue = "",
    usdValue = "",
    onInputChange,
    isUsd = false,
    token,
    onToggleUsd,
    canConvert = false,
    tokenDecimals = 8,
    showPresetButtons = false,
    presetButtons = [],
    isDisabled = false,
    showInput = true,
    isTip = false,
    maxUse = 1,
    walletTokens = [],
  }: Props = $props();

  const displayValue = $derived(isUsd ? usdValue : tokenValue);

  let localInputValue = $state(displayValue || "");
  let previousDisplayValue = $state(displayValue);

  $effect(() => {
    if (displayValue !== previousDisplayValue) {
      localInputValue = displayValue || "";
      previousDisplayValue = displayValue;
    }
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function handleKeyDown(e: KeyboardEvent) {
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
      ].includes(e.key)
    ) {
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      return;
    }

    // Prevent minus sign (-) - never allow negative numbers
    if (e.key === "-" || e.key === "Minus") {
      e.preventDefault();
      return;
    }

    const char = e.key;
    const currentValue = localInputValue;
    const hasDecimal = currentValue.includes(".");

    if (!/[0-9]/.test(char) && char !== ".") {
      e.preventDefault();
      return;
    }

    if (char === "." && hasDecimal) {
      e.preventDefault();
      return;
    }
  }

  const maxBalance = $derived(
    token?.balance ? parseBalanceUnits(token.balance, token.decimals) : 0,
  );

  // Get max available balance with fee consideration
  const maxBalanceWithFee = $derived.by(() => {
    if (!token || !walletTokens || walletTokens.length === 0) return maxBalance;

    const maxAmountResult = maxAmountForAsset(
      token.address,
      maxUse,
      walletTokens,
    );

    if (maxAmountResult.isErr()) {
      console.warn(
        "Failed to calculate max amount with fee:",
        maxAmountResult.error,
      );
      return maxBalance; // Fallback to balance without fee
    }

    const maxAmountBigInt = maxAmountResult.unwrap();
    return parseBalanceUnits(maxAmountBigInt, token.decimals);
  });

  function handleInputChange(value: string) {
    if (value.startsWith("-")) {
      value = value.replace(/^-+/, "");
    }

    let sanitized = "";
    let hasDecimal = false;

    for (let i = 0; i < value.length; i++) {
      const char = value[i];

      if (/[0-9]/.test(char)) {
        sanitized += char;
      } else if ((char === "." || char === ",") && !hasDecimal) {
        sanitized += ".";
        hasDecimal = true;
      }
    }

    localInputValue = sanitized;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      onInputChange?.(sanitized);
    }, 1000);
  }

  // Get max USD value (if token has price) - using maxBalanceWithFee
  const maxUsdValue = $derived(
    token?.priceUSD && token.priceUSD > 0
      ? maxBalanceWithFee * token.priceUSD
      : 0,
  );

  function handleBlur() {
    if (!token || !localInputValue) return;

    const inputValue = parseFloat(localInputValue);
    if (isNaN(inputValue) || inputValue <= 0) return;

    let exceedsBalance = false;
    let maxValue = 0;
    let maxValueStr = "";

    if (isUsd) {
      if (token.priceUSD && token.priceUSD > 0 && inputValue > maxUsdValue) {
        exceedsBalance = true;
        maxValue = maxUsdValue;
        maxValueStr = maxUsdValue.toFixed(2).replace(/\.?0+$/, "");
      }
    } else {
      // Use maxBalanceWithFee to account for transaction fees
      if (inputValue > maxBalanceWithFee) {
        exceedsBalance = true;
        maxValue = maxBalanceWithFee;
        maxValueStr = maxBalanceWithFee.toString();

        console.log("Input exceeds balance with fee:", {
          inputValue,
          maxBalance: maxBalance,
          maxBalanceWithFee: maxBalanceWithFee,
          fee: token.fee,
          feeHuman: parseBalanceUnits(token.fee, token.decimals),
          maxUse: maxUse,
        });
      }
    }

    if (exceedsBalance) {
      localInputValue = maxValueStr;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      onInputChange?.(maxValueStr);

      const symbol = isUsd ? "USD" : token.symbol;
      const message = locale
        .t("links.linkForm.addAsset.maxBalanceExceeded")
        .replace("{{max}}", formatNumber(maxValue))
        .replace("{{symbol}}", symbol);
      toast.info(message, {
        duration: 3000,
      });
    }
  }

  function formatDisplayValue(value: string): string {
    if (!value) return "";

    const num = parseFloat(value);

    if (!isNaN(num) && Math.abs(num) > 0 && Math.abs(num) < 0.0001) {
      return num.toLocaleString("fullwide", {
        useGrouping: false,
        maximumFractionDigits: 20,
      });
    }

    return value;
  }

  const inputWidth = $derived(
    `${Math.max((formatDisplayValue(localInputValue) || "").length * 9, 30)}px`,
  );

  const balanceDisplay = $derived(
    token?.balance
      ? formatNumber(parseBalanceUnits(token.balance, token.decimals))
      : "0",
  );

  function focusInput() {
    const input = document.getElementById(
      `asset-input-${token?.address || "default"}`,
    );
    input?.focus();
  }

  function handleInputAreaKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusInput();
    }
  }
</script>

<div class="flex flex-col w-full relative">
  <!-- Asset selector with input -->
  <div
    class="input-field-asset flex items-center relative rounded-md border border-gray-300 hover:border-green focus:border-green focus:ring-0 py-2 px-3 focus:outline-none"
  >
    {#if children}
      <div class="flex items-center w-full relative">
        <div class="text-left w-fit max-w-[calc(100%-120px)]">
          {@render children()}
        </div>
        <div class="flex w-fit items-center ml-auto relative">
          {#if showInput}
            <div class="relative flex items-center">
              {#if isUsd}
                <span class="text-[14px] text-gray-400 mr-1">$</span>
              {/if}
              <input
                id="asset-input-{token?.address || 'default'}"
                value={formatDisplayValue(localInputValue)}
                oninput={(e) => handleInputChange(e.currentTarget.value)}
                onkeydown={handleKeyDown}
                onblur={handleBlur}
                type="number"
                class="w-auto min-w-[30px] ml-auto text-end text-[14px] font-normal placeholder:text-[#D9D9D9] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style="width: {inputWidth}; max-width: 250px; position: relative; z-index: 0;"
                placeholder="0"
                min={0}
                inputmode="decimal"
              />
              <div
                role="button"
                tabindex="0"
                onclick={focusInput}
                onkeydown={handleInputAreaKeyDown}
                class="absolute right-0 top-0 h-full w-[90px] z-20 cursor-pointer"
              ></div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <span class="flex items-center">
        <span class="flex-grow text-left">{text}</span>
      </span>
    {/if}
  </div>

  <!-- Balance and USD Switch -->
  {#if token}
    <div class="flex px-1 items-center justify-between mt-1.5">
      <p class="text-[10px] font-light text-grey-400/60">
        {locale.t("links.linkForm.addAsset.balance")}
        {balanceDisplay}
        {token?.symbol}
      </p>

      {#if onToggleUsd}
        <UsdSwitch
          {token}
          amount={parseFloat(tokenValue || "0") || 0}
          symbol={token?.name ?? ""}
          {isUsd}
          onToggle={onToggleUsd}
          {canConvert}
          usdDecimals={2}
        />
      {/if}
    </div>
  {/if}

  <!-- Preset Buttons -->
  {#if showPresetButtons && presetButtons.length > 0 && canConvert && isTip}
    <div class="mt-8">
      <AmountActionButtons data={presetButtons} {isDisabled} />
    </div>
  {/if}
</div>
