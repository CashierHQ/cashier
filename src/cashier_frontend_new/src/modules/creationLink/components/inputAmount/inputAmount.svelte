<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { validationService } from "$modules/links/services/validationService";
  import {
    computeAmountFromInput,
    parseDisplayNumber,
    sanitizeInput,
    trimNumber,
  } from "$modules/links/utils/inputAmount";
  import { USD_DISPLAY_DECIMALS } from "$modules/shared/constants";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { walletStore } from "../../../../../../../token/state/walletStore.svelte";
  import type { TokenWithPriceAndBalance } from "../../../../../../../token/types";

  let {
    token,
    tokenAmount = $bindable<bigint>(0n),
  }: {
    token: TokenWithPriceAndBalance;
    tokenAmount: bigint;
  } = $props();

  // read-only input string derived from `tokenAmount`
  let mode: string = $state("amount");
  let userInput: string = $state("");

  let formattedValue: string = $derived.by(() => {
    if (tokenAmount != null && tokenAmount !== undefined) {
      const asAmount: number = parseBalanceUnits(tokenAmount, token.decimals);
      if (mode === "amount") {
        return String(asAmount);
      } else {
        if (token.priceUSD && token.priceUSD > 0) {
          // trim floating-point precision for USD display to avoid extremely long decimal strings
          return trimNumber(asAmount * token.priceUSD, USD_DISPLAY_DECIMALS);
        }
      }
    }
    return "";
  });

  // reset userInput when token changes
  $effect(() => {
    if (token) {
      userInput = formattedValue;
    }
  });

  // converted value: if mode === 'amount' -> USD equivalent, else -> token equivalent
  let converted = $derived.by(() => {
    const parsed = parseDisplayNumber(userInput);
    if (parsed == null) return 0;
    if (!token.priceUSD || token.priceUSD <= 0) return 0;
    if (mode === "amount") {
      // mode 'amount' means the input is token amount -> show USD
      return parsed * token.priceUSD;
    } else {
      // mode 'usd' means the input is USD amount -> show tokens
      return parsed / token.priceUSD;
    }
  });

  // Handle input events and keep numeric displayNumber
  function handleInput(e: Event) {
    const t = e.target as HTMLInputElement;
    // sanitize input (removes invalid chars) and parse
    const sanitizedInput = sanitizeInput(t.value);
    if (sanitizedInput !== t.value) {
      // update input field if sanitization changed the value
      t.value = sanitizedInput;
    }

    userInput = sanitizedInput;
    const parsed = parseDisplayNumber(sanitizedInput);

    if (parsed == null) {
      // empty or invalid
      tokenAmount = 0n;
    } else {
      tokenAmount = computeAmountFromInput({
        num: parsed,
        mode,
        priceUsd: token.priceUSD,
        decimals: token.decimals,
      });
    }
  }

  // Toggle mode (external callers can set `mode` prop too)
  function handleToggleMode(m: "amount" | "usd") {
    // disallow switching to USD when price is not provided
    if (m === "usd" && !token.priceUSD) return;
    mode = m;

    const parsed = parseDisplayNumber(userInput);
    if (parsed == null || parsed <= 0) {
      userInput = "";
      return;
    }

    if (mode === "usd") {
      userInput = (parsed * token.priceUSD).toFixed(5);
    } else {
      userInput = (parsed / token.priceUSD).toFixed(5);
    }
  }

  // Set max amount based on wallet balance and validation service
  function handleSetMax() {
    if (!walletStore.query.data) {
      return;
    }

    const maxUse = 1; // TipLink has maxUse = 1 per asset
    const maxAmountForAsset = validationService.maxAmountForAsset(
      token.address,
      maxUse,
      walletStore.query.data,
    );
    if (maxAmountForAsset.isErr()) {
      return;
    }

    tokenAmount = maxAmountForAsset.unwrap();
    userInput = formattedValue;
  }
</script>

<div class="flex flex-col space-y-1">
  <div class="flex items-center justify-between">
    <Label>Amount</Label>
    <div class="space-x-2">
      <Button
        type="button"
        class={`px-2 py-1 border rounded text-sm ${mode === "amount" ? "bg-blue-600 text-white border-blue-600" : ""}`}
        aria-pressed={mode === "amount"}
        onclick={() => handleToggleMode("amount")}
      >
        Amount
      </Button>
      <Button
        type="button"
        class={`px-2 py-1 border rounded text-sm ${mode === "usd" ? "bg-blue-600 text-white border-blue-600" : ""}`}
        aria-pressed={mode === "usd"}
        onclick={() => handleToggleMode("usd")}
        disabled={!token.priceUSD}
      >
        USD
      </Button>
      <Button class="px-2 py-1 border rounded text-sm" onclick={handleSetMax}>
        Max
      </Button>
    </div>
  </div>

  <Input
    value={userInput}
    type="text"
    inputmode="decimal"
    step="any"
    min="0"
    placeholder={mode === "amount" ? "0.00" : "0.00 USD"}
    oninput={handleInput}
    aria-label={mode === "amount" ? "token amount" : "usd amount"}
  />

  <div class="text-sm text-gray-500">
    {#if token.priceUSD}
      1 token = {token.priceUSD} USD
    {:else}
      Price not available
    {/if}
    {#if converted != null}
      <div class="text-sm text-gray-700 mt-1">
        {#if mode === "amount"}
          ≈ ${formatNumber(converted)} USD
        {:else}
          ≈ {formatNumber(converted)} tokens
        {/if}
      </div>
    {/if}
  </div>
</div>
