<script lang="ts">
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { locale } from "$lib/i18n";
  import { toast } from "svelte-sonner";
  import UsdSwitch from "./UsdSwitch.svelte";
  import AmountActionButtons from "./AmountActionButtons.svelte";
  import type { Snippet } from "svelte";
  import { formatDisplayValue } from "$modules/creationLink/utils/formatDisplayValue";
  import { sanitizeNumericInput } from "$modules/creationLink/utils/sanitize-numeric-input";

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
    showPresetButtons?: boolean;
    presetButtons?: PresetButton[];
    isDisabled?: boolean;
    showInput?: boolean;
    isTip?: boolean;
    maxBalanceWithFee?: number;
    children?: Snippet<[]>;
  };

  let {
    text,
    children,
    tokenValue = $bindable(""),
    usdValue = $bindable(""),
    onInputChange,
    isUsd = false,
    token,
    onToggleUsd,
    canConvert = false,
    showPresetButtons = false,
    presetButtons = [],
    isDisabled = false,
    showInput = true,
    isTip = false,
    maxBalanceWithFee = 0,
  }: Props = $props();

  // Display value derived from bound props - no local state needed
  const displayValue = $derived(isUsd ? usdValue : tokenValue);

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
    const currentValue = displayValue;
    const hasDecimal = currentValue.includes(".") || currentValue.includes(",");

    if (!/[0-9]/.test(char) && char !== "." && char !== ",") {
      e.preventDefault();
      return;
    }

    if ((char === "." || char === ",") && hasDecimal) {
      e.preventDefault();
      return;
    }
  }

  const maxBalance = $derived(
    token?.balance ? parseBalanceUnits(token.balance, token.decimals) : 0,
  );

  // Update bound value directly, debounce side effects
  function updateValue(sanitized: string) {
    if (isUsd) {
      usdValue = sanitized;
    } else {
      tokenValue = sanitized;
    }
  }

  function handleInput(value: string) {
    const sanitized = sanitizeNumericInput(value);

    // Update bound value immediately for responsive UI
    updateValue(sanitized);

    // Call onInputChange immediately for reactive conversion (USD <-> token)
    // This ensures the input is reactive and updates instantly
    onInputChange?.(sanitized);
  }

  // Get max USD value (if token has price) - using maxBalanceWithFee
  const maxUsdValue = $derived(
    token?.priceUSD && token.priceUSD > 0
      ? maxBalanceWithFee * token.priceUSD
      : 0,
  );

  function handleBlur() {
    if (!token || !displayValue) return;

    const inputValue = parseFloat(displayValue);
    if (isNaN(inputValue) || inputValue <= 0) return;

    const hasInsufficientFunds =
      !isFinite(maxBalanceWithFee) ||
      maxBalanceWithFee <= 0 ||
      maxBalance <= 0 ||
      !isFinite(maxBalance);

    if (hasInsufficientFunds) {
      return;
    }

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
      if (inputValue > maxBalanceWithFee) {
        exceedsBalance = true;
        maxValue = maxBalanceWithFee;
        maxValueStr = maxBalanceWithFee.toString();
      }
    }

    if (exceedsBalance) {
      updateValue(maxValueStr);
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

  const inputWidth = $derived(
    `${Math.max((formatDisplayValue(displayValue) || "").length * 9, 30)}px`,
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
                value={formatDisplayValue(displayValue)}
                oninput={(e) => handleInput(e.currentTarget.value)}
                onkeydown={handleKeyDown}
                onblur={handleBlur}
                type="number"
                class="w-auto min-w-[30px] ml-auto text-end text-[14px] font-normal placeholder:text-[#D9D9D9] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style="width: {inputWidth}; max-width: 92px; position: relative; z-index: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
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
