<script lang="ts">
  import { locale } from "$lib/i18n";
  import {
    BridgeTransactionStatus,
    type BridgeTransactionWithUsdValue,
    BridgeType,
  } from "$modules/bitcoin/types/bridge_transaction";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import { ArrowDownLeft } from "lucide-svelte";

  interface Props {
    bridge: BridgeTransactionWithUsdValue;
    onSelect: (txid: string) => void;
  }

  let { bridge, onSelect }: Props = $props();
  let typeTitle = $derived.by(() => {
    if (bridge.bridge_type === BridgeType.Import) {
      if (bridge.status === BridgeTransactionStatus.Completed) {
        return locale.t("bitcoin.receive.imported");
      } else {
        return locale.t("bitcoin.receive.importing");
      }
    } else if (bridge.bridge_type === BridgeType.Export) {
      if (bridge.status === BridgeTransactionStatus.Completed) {
        return locale.t("bitcoin.receive.exported");
      } else {
        return locale.t("bitcoin.receive.exporting");
      }
    }
    return locale.t("bitcoin.receive.unknown");
  });
  let amount = $derived.by(() => {
    if (bridge.total_amount) {
      // Assuming total_amount is in satoshis for BTC
      return (Number(bridge.total_amount) / 100_000_000).toFixed(8);
    }
    return "0";
  });
</script>

<button class="w-full text-left" onclick={() => onSelect(bridge.bridge_id)}>
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
            +{amount}
          </p>
        </div>
        <div class="flex justify-between items-start">
          <p class="text-[10px]/[100%] text-grey">
            From: {transformShortAddress(bridge.btc_address)}
          </p>
          <p class="text-[10px]/[100%] text-grey text-right">
            ${bridge.total_amount_usd ?? "0.00"}
          </p>
        </div>
      </div>
    </div>
  </div>
</button>
