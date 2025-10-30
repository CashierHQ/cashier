<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { formatBalanceUnits } from "$modules/shared/utils/converter";

  // bindable value (base units) and mode ("amount" | "usd")
  // usd: number (how many USD this shortcut represents, default 1)
  let {
    value = $bindable<bigint>(),
    mode = $bindable<string>(),
    usd = 1,
    decimals = 0,
    priceUsd,
  } = $props();

  function onClick() {
    if (priceUsd && decimals != null && priceUsd > 0) {
      mode = "amount";
      const tokenAmountForUsd = usd / priceUsd;
      const precision = Math.min(10, Math.max(5, decimals));
      // formatBalanceUnits expects a Number amount and decimals and returns bigint
      value = formatBalanceUnits(
        Number(tokenAmountForUsd.toFixed(precision)),
        decimals,
      );
    }
  }
</script>

<Button variant="outline" onclick={onClick}>{usd}$</Button>
