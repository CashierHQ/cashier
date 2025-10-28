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

  // input string shown in the input, do no
  let input: string = $state("");

  const USD_DISPLAY_DECIMALS = 6;

  function trimNumber(n: number, decimals = USD_DISPLAY_DECIMALS) {
    if (!isFinite(n)) return String(n);
    // limit precision and strip trailing zeros
    const fixed = n.toFixed(decimals);
    return fixed.replace(/\.?0+$/, "");
  }

  // converted value: if mode === 'amount' -> USD equivalent, else -> token equivalent
  let converted = $derived(() => {
    const parsed = parseDisplayNumber(input);
    if (parsed == null) return 0;
    if (!priceUsd || priceUsd <= 0) return 0;
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
    if (value != null && value !== undefined) {
      const asAmount: number = parseBalanceUnits(value, decimals);
      if (mode === "amount") {
        input = String(asAmount);
      } else {
        if (priceUsd && priceUsd > 0) {
          // trim floating-point precision for USD display to avoid extremely long decimal strings
          input = trimNumber(asAmount * priceUsd, USD_DISPLAY_DECIMALS);
        } else {
          input = "";
        }
      }
    }
  });

  // Handle input events and keep numeric displayNumber
  function handleInput(e: Event) {
    const t = e.target as HTMLInputElement;
    // sanitize input (removes invalid chars) and parse
    const sanitized = sanitizeInput(t.value);
    input = sanitized;
    const parsed = parseDisplayNumber(input);
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
      input = String(asAmount);
    } else if (priceUsd && priceUsd > 0) {
      input = trimNumber(asAmount * priceUsd, USD_DISPLAY_DECIMALS);
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
        disabled={!balance || balance === 0n}
      >
        Max
      </Button>
    </div>
  </div>

  <Input
    bind:value={input}
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
          ≈ ${formatNumber(converted())}
        {:else}
          ≈ {formatNumber(converted())} tokens
        {/if}
      </div>
    {/if}
  </div>
</div>
