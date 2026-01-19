<script lang="ts">
  import { type BitcoinTransaction } from '$modules/bitcoin/types';

  interface Props {
    transaction: BitcoinTransaction;
    onSelect: (txid: string) => void;
  }

  let { transaction, onSelect }: Props = $props();
</script>
<button
  type="button"
  class="w-full flex items-center p-4 hover:bg-gray-100 rounded-lg text-left"
  onclick={() => onSelect(transaction.txid)}
>
<div class="relative w-full aspect-square">{transaction.txid}</div>

</button>
