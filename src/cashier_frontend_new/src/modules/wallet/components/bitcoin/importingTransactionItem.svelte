<script lang="ts">
  import { type BridgeTransaction, BridgeType } from '$modules/bitcoin/types/bridge_transaction';
  import {
      ArrowDownLeft
  } from "lucide-svelte";

  interface Props {
    transaction: BridgeTransaction;
    onSelect: (txid: string) => void;
  }

  let { transaction, onSelect }: Props = $props();
  let typeTitle = $derived.by(() => {
    if (transaction.bridge_type === BridgeType.Import) {
      return "Importing";
    }
    return "Exporting";
  });
  let amount = $derived.by(() => {
    if (transaction.total_amount) {
      // Assuming total_amount is in satoshis for BTC
      return (Number(transaction.total_amount) / 100_000_000).toFixed(8);
    }
    return "N/A";
  });
</script>
<button class="w-full text-left" onclick={() => onSelect(transaction.bridge_id)}>
<div class="space-y-3">
  <div class="flex items-start gap-3 py-2">
    <div
      class="w-9 h-9 rounded-full bg-lightgreen flex items-center justify-center flex-shrink-0 mt-1"
    >
      <ArrowDownLeft class="w-5 h-5 text-gray-700" />
    </div>

    <div class="flex-1 min-w-0 flex flex-col justify-between h-full">
      <div class="flex justify-between items-start mb-1">
        <p class="text-[#222222]">
          {typeTitle}
        </p>
        <p class="text-[#222222] text-right">
          {amount}
        </p>
      </div>
      <div class="flex justify-between items-start">
        <p class="text-[10px]/[100%] text-grey">
          From: {transaction.btc_address}
        </p>
        <p class="text-[10px]/[100%] text-grey text-right">
          $0.123
        </p>
      </div>
    </div>
  </div>
</div>
</button>
