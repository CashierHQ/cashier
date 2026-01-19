<script lang="ts">
  import { type BitcoinTransaction } from '$modules/bitcoin/types';
  import {
      ArrowDownLeft
  } from "lucide-svelte";

  interface Props {
    transaction: BitcoinTransaction;
    onSelect: (txid: string) => void;
  }

  let { transaction, onSelect }: Props = $props();
</script>
<button class="w-full text-left" onclick={() => onSelect(transaction.txid)}>
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
          {transaction.txid}
        </p>
        <p class="text-[#222222] text-right">
          bar
        </p>
      </div>
      <div class="flex justify-between items-start">
        <p class="text-[10px]/[100%] text-grey">
          19-01
        </p>
        <p class="text-[10px]/[100%] text-grey text-right">
          $0.123
        </p>
      </div>
    </div>
  </div>
</div>
</button>
