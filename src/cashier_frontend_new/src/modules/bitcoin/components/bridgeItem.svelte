<script lang="ts">
  import { locale } from "$lib/i18n";
  import {
      BridgeAssetType,
      BridgeTransactionStatus,
      type BridgeTransactionWithUsdValue,
      BridgeType,
  } from "$modules/bitcoin/types/bridge_transaction";
  import { formatNumber } from "$modules/shared/utils/formatNumber";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import {
      ArrowDownLeft,
      ArrowUpRight,
      ClockArrowDown,
      ClockArrowUp,
  } from "lucide-svelte";

  interface Props {
    bridge: BridgeTransactionWithUsdValue;
    onSelect: (txid: string) => void;
  }

  let { bridge, onSelect }: Props = $props();
  let typeTitle = $derived.by(() => {
    if (bridge.bridge_type === BridgeType.Import) {
      if (bridge.status === BridgeTransactionStatus.Completed) {
        return locale.t("bitcoin.receive.imported");
      } else if (bridge.status === BridgeTransactionStatus.Failed) {
        return locale.t("bitcoin.receive.failed");
      } else if (
        bridge.status === BridgeTransactionStatus.Pending ||
        bridge.status === BridgeTransactionStatus.Confirmed
      ) {
        return locale.t("bitcoin.receive.importing");
      } else if (bridge.status === BridgeTransactionStatus.Created) {
        return locale.t("bitcoin.receive.created");
      } else {
        return locale.t("bitcoin.receive.unknown");
      }
    } else if (bridge.bridge_type === BridgeType.Export) {
      if (bridge.status === BridgeTransactionStatus.Completed) {
        return locale.t("bitcoin.send.exported");
      } else if (bridge.status === BridgeTransactionStatus.Failed) {
        return locale.t("bitcoin.send.failed");
      } else if (
        bridge.status === BridgeTransactionStatus.Pending ||
        bridge.status === BridgeTransactionStatus.Confirmed
      ) {
        return locale.t("bitcoin.send.exporting");
      } else if (bridge.status === BridgeTransactionStatus.Created) {
        return locale.t("bitcoin.send.created");
      } else {
        return locale.t("bitcoin.receive.unknown");
      }
    }
    return locale.t("bitcoin.receive.unknown");
  });
  let amount = $derived.by(() => {
    const runeAsset = bridge.asset_infos.find(
      (a) => a.asset_type === BridgeAssetType.Runes,
    );
    if (runeAsset) {
      const value = Number(runeAsset.amount) / 10 ** runeAsset.decimals;
      return formatNumber(value, { tofixed: runeAsset.decimals });
    }
    if (bridge.total_amount) {
      const btc = Number(bridge.total_amount) / 100_000_000;
      return formatNumber(btc, { tofixed: 8 });
    }
    return "0";
  });
  let isExport = $derived(bridge.bridge_type === BridgeType.Export);
  let isBridgeInProgress = $derived(
    bridge.status === BridgeTransactionStatus.Pending ||
      bridge.status === BridgeTransactionStatus.Created,
  );
</script>

<button class="w-full text-left" onclick={() => onSelect(bridge.bridge_id)}>
  <div class="space-y-3">
    <div class="flex items-start gap-3 py-2">
      <div
        class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 {isBridgeInProgress
          ? 'bg-lightyellow'
          : 'bg-lightgreen'}"
      >
        {#if isBridgeInProgress}
          {#if isExport}
            <ClockArrowUp class="w-5 h-5 text-lightyellow-accent" />
          {:else}
            <ClockArrowDown class="w-5 h-5 text-lightyellow-accent" />
          {/if}
        {:else if isExport}
          <ArrowUpRight class="w-5 h-5 text-gray-700" />
        {:else}
          <ArrowDownLeft class="w-5 h-5 text-gray-700" />
        {/if}
      </div>

      <div class="flex-1 min-w-0 flex flex-col justify-between h-full">
        <div class="flex justify-between items-start mb-1">
          <p class="text-[#222222]">
            {typeTitle}
          </p>
          <p class="text-[#222222] text-right">
            {isExport ? "-" : "+"}{amount}
          </p>
        </div>
        <div class="flex justify-between items-start">
          <p class="text-[10px]/[100%] text-grey">
            {isExport ? "To" : "From"}: {transformShortAddress(
              bridge.btc_address,
            )}
          </p>
          <p class="text-[10px]/[100%] text-grey text-right">
            ${bridge.total_amount_usd ?? "0.00"}
          </p>
        </div>
      </div>
    </div>
  </div>
</button>
