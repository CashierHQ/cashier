<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
    import { parseBalanceUnits } from "$modules/shared/utils/converter";
    import { formatNumber } from "$modules/shared/utils/formatNumber";
  import {
    sanitizeInput,
    parseDisplayNumber,
    computeAmountFromInput,
  } from "./utils";
  // force `value` to be a number (base units) at the type level
  let {
    decimals = 8,
    priceUsd,
    mode = "amount",
    value = $bindable<bigint>(0n),
    balance,
  }: {
    decimals?: number;
    priceUsd?: number;
    mode?: "amount" | "usd";
    value: bigint;
    balance?: bigint;
  } = $props();

  // input string shown in the input (preserves caret while typing)
  let displayStr: string = $state("");

  // converted value: if mode === 'amount' -> USD equivalent, else -> token equivalent
  let converted = $derived(() => {
    const parsed = parseDisplayNumber(displayStr);
    if (parsed == null) return null;
    if (!priceUsd || priceUsd <= 0) return null;
    if (mode === "amount") {
      // mode 'amount' means the input is token amount -> show USD
      return parsed * priceUsd;
    } else {
      // mode 'usd' means the input is USD amount -> show tokens
      return parsed / priceUsd;
    }
  });

  // Initialize inputStr from incoming `value`
  $effect(() => {
    // only update the displayed string when the input is not focused
    if (value != null && value !== undefined) {
      const asAmount: number = parseBalanceUnits(value, decimals);
      if (mode === "amount") {
        displayStr = formatNumber(asAmount);
      } else {
        if (priceUsd && priceUsd > 0) {
          displayStr = formatNumber(asAmount * priceUsd);
        } else {
          displayStr = "";
        }
      }
    }
  });

  // Handle input events and keep numeric displayNumber
  function handleInput(e: Event) {
    const t = e.target as HTMLInputElement;
    // sanitize input (removes invalid chars) and parse
    const sanitized = sanitizeInput(t.value);
    displayStr = sanitized;
    const parsed = parseDisplayNumber(displayStr);
    if (parsed == null) {
      // empty or invalid
      value = 0n;
      return;
    }

    value = computeAmountFromInput({
        num: parsed,
        mode,
        priceUsd,
        decimals,
    });
  }

  // Toggle mode (external callers can set `mode` prop too)
  function setMode(m: "amount" | "usd") {
    // disallow switching to USD when price is not provided
    if (m === "usd" && !priceUsd) return;
    mode = m;
    // when switching, refresh the displayed string to reflect current value in the new mode
    const asAmount: number = parseBalanceUnits(value, decimals);
    if (mode === "amount") {
      displayStr = formatNumber(asAmount);
    } else if (priceUsd && priceUsd > 0) {
      displayStr = formatNumber(asAmount * priceUsd);
    }
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
        onclick={() => setMode("amount")}
      >
        Amount
      </Button>
      <Button
        type="button"
        class={`px-2 py-1 border rounded text-sm ${mode === "usd" ? "bg-blue-600 text-white border-blue-600" : ""}`}
        aria-pressed={mode === "usd"}
        onclick={() => setMode("usd")}
        disabled={!priceUsd}
      >
        USD
      </Button>
      <Button
        class="px-2 py-1 border rounded text-sm"
        onclick={() => {
          // balance is expected to be base units (bigint or number)
          if (!balance) return;
          value = balance;
          // ensure input string refreshes via the effect
        }}
        disabled={!balance ||
          (typeof balance === "number" && balance <= 0) ||
          (typeof balance === "bigint" && balance === 0n)}
      >
        Max
      </Button>
    </div>
  </div>

  <Input
    bind:value={displayStr}
    type="text"
    inputmode="decimal"
    step="any"
    min="0"
    placeholder={mode === "amount" ? "0.00" : "0.00 USD"}
    oninput={handleInput}
    aria-label={mode === "amount" ? "token amount" : "usd amount"}
  />

  <div class="text-sm text-gray-500">
    {#if priceUsd}
      1 token = {priceUsd} USD
    {:else}
      Price not available
    {/if}
    {#if converted() != null}
      <div class="text-sm text-gray-700 mt-1">
        {#if mode === "amount"}
          ≈ ${converted()!.toFixed(2)}
        {:else}
          ≈ {converted()!.toFixed(Math.min(6, decimals))} tokens
        {/if}
      </div>
    {/if}
  </div>
</div>
