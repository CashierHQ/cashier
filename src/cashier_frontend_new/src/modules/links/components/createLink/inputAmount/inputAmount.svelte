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

  // input string shown in the input, do not bind `value` directly to input
  let displayStr: string = $state("");

  // converted value: if mode === 'amount' -> USD equivalent, else -> token equivalent
  let converted = $derived(() => {
    const parsed = parseDisplayNumber(displayStr);
    if (parsed == null) return null;
    if (!priceUsd || priceUsd <= 0) return null;
    return mode === "amount" ? parsed * priceUsd : parsed / priceUsd;
  });

  // Helper: format the current `value` into the display string depending on `mode`
  function formatValueForDisplay(): string {
    if (value == null) return "";
    const asAmount = parseBalanceUnits(value, decimals);
    if (mode === "amount") return formatNumber(asAmount);
    if (priceUsd && priceUsd > 0) return formatNumber(asAmount * priceUsd);
    return "";
  }

  // Update the displayed string when `value`, `mode`, or `priceUsd` changes
  $effect(() => {
    displayStr = formatValueForDisplay();
  });

  // Handle input events and keep numeric displayNumber
  function handleInput(e: Event) {
    const t = e.target as HTMLInputElement;
    displayStr = sanitizeInput(t.value);
    const parsed = parseDisplayNumber(displayStr);
    if (parsed == null) {
      value = 0n;
      return;
    }

    value = computeAmountFromInput({ num: parsed, mode, priceUsd, decimals });
  }

  // Toggle mode (external callers can set `mode` prop too)
  function setMode(m: "amount" | "usd") {
    if (m === "usd" && !priceUsd) return;
    mode = m;
    displayStr = formatValueForDisplay();
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
