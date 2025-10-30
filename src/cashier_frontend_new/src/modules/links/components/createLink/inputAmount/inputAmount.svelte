<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Input from "$lib/shadcn/components/ui/input/input.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import {
    formatBalanceUnits,
    parseBalanceUnits,
  } from "$modules/shared/utils/converter";
  import { ArrowDownUp } from "lucide-svelte";

  let {
    priceUsd,
    mode = $bindable<"amount" | "usd">("amount"),
    value = $bindable<bigint>(0n),
    decimals,
    balance,
    symbol,
    ledgerFee = 0n,
  }: {
    priceUsd?: number;
    mode?: "amount" | "usd";
    value: bigint;
    decimals?: number;
    balance?: bigint;
    symbol: string;
    ledgerFee?: bigint;
  } = $props();

  let input: number = $state(parseBalanceUnits(value, decimals ?? 8));

  $effect(() => {
    if (decimals != null) {
      console.log("test");
      input = parseBalanceUnits(value, decimals);
    }
  });

  // converted value: if mode === 'amount' -> USD equivalent, else -> token equivalent
  let converted = $derived.by(() => {
    if (!priceUsd) return null;
    if (mode === "amount") {
      // mode 'amount' means the input is token amount -> show USD
      return input * priceUsd;
    } else {
      // mode 'usd' means the input is USD amount -> show tokens
      return input / priceUsd;
    }
  });

  function setMode(m: "amount" | "usd") {
    if (m === "usd" && !priceUsd) return;
    mode = m;
    if (converted != null) {
      input = Number(converted.toFixed(6));
      return;
    }
  }

  $effect(() => {
    if (decimals != null) {
      value = formatBalanceUnits(input, decimals);
    }
  });
</script>

<div class="flex flex-col space-y-1">
  <div class="flex items-center justify-between">
    <Label>Amount</Label>
    <div class="space-x-2">
      <Button
        type="button"
        class={`px-2 py-1 border rounded text-sm ${mode === "usd" ? "bg-blue-600 text-white border-blue-600" : ""}`}
        aria-pressed={mode === "usd"}
        onclick={() => setMode(mode === "amount" ? "usd" : "amount")}
        disabled={!priceUsd && mode === "amount"}
        title="Toggle amount / USD"
      >
        <ArrowDownUp class="w-4 h-4" />
      </Button>
      <Button
        class="px-2 py-1 border rounded text-sm"
        onclick={() => {
          if (!balance || !decimals) return;
          input = parseBalanceUnits(balance - ledgerFee, decimals);
        }}
        disabled={!balance || balance === 0n}
      >
        Max
      </Button>
    </div>
  </div>

  <Input
    bind:value={input}
    type="number"
    inputmode="decimal"
    step="any"
    min="0"
    placeholder={mode === "amount" ? "0.00" : "0.00 USD"}
    aria-label={mode === "amount" ? "token amount" : "usd amount"}
    disabled={decimals == null}
    aria-invalid={decimals == null}
    title={decimals == null ? "Token decimals unavailable" : undefined}
    pattern="[0-9]"
  />

  <div class="text-sm">
    {#if decimals == null}
      <div class="text-sm text-red-600 mt-1">
        Decimals is not found - try refresh
      </div>
    {:else}
      <div class="text-sm text-gray-500">
        {#if priceUsd}
          {#if converted != null}
            <div class="text-sm text-gray-700 mt-1">
              {#if mode === "amount"}
                ≈ ${formatNumber(converted)}
              {:else}
                ≈ {formatNumber(converted)} {symbol}
              {/if}
            </div>
          {/if}
        {:else}
          <div class="text-sm text-gray-500 mt-1">USD price unavailable</div>
        {/if}
      </div>
    {/if}
  </div>
</div>
