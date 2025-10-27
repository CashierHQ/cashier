<script lang="ts">
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import type { AssetInfo } from "../../types/link/asset";

  interface Props {
    assetInfo: AssetInfo;
  }

  let { assetInfo }: Props = $props();

  const assetAddressToText = (asset: any) => {
    try {
      if (asset?.address && typeof asset.address.toText === "function")
        return asset.address.toText();
      if (asset?.IC?.address && typeof asset.IC.address.toText === "function")
        return asset.IC.address.toText();
      if (
        asset?.asset?.IC?.address &&
        typeof asset.asset.IC.address.toText === "function"
      )
        return asset.asset.IC.address.toText();
      return null;
    } catch (e) {
      return null;
    }
  };

  const address = assetAddressToText(assetInfo.asset);
  const tokenMeta = address ? tokenMetadataQuery(address) : null;

  const displaySymbol = () => {
    if (!address) return assetInfo.label ?? "TOKEN";
    return tokenMeta?.data?.symbol ?? assetInfo.label ?? "TOKEN";
  };

  const displayAmount = () => {
    if (!address) return String(assetInfo.amount_per_link_use_action);
    const decimals = tokenMeta?.data?.decimals ?? 8;
    return parseBalanceUnits(
      assetInfo.amount_per_link_use_action,
      decimals,
    ).toFixed(5);
  };
</script>

<div class="p-3 rounded flex items-center justify-between">
  <div>
    <div class="text-sm font-medium">{displaySymbol()}</div>
    <div class="text-xs text-muted-foreground">
      {assetInfo.asset.kind}{assetInfo.asset.address
        ? ` - ${String(assetInfo.asset.address)}`
        : ""}
    </div>
  </div>
  <div class="text-right">
    <div class="text-lg font-semibold">{displayAmount()}</div>
    <div class="text-xs text-muted-foreground">per claim</div>
  </div>
</div>
