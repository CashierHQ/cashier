<script lang="ts">
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import type { AssetInfo } from "../../types/link/asset";
  import { walletStore } from "$modules/token/state/walletStore.svelte";

  interface Props {
    assetInfo: AssetInfo;
  }

  let { assetInfo }: Props = $props();

  // Derive address directly from the frontend Asset model
  const address =
    assetInfo.asset.address?.toText?.() ??
    assetInfo.asset.address?.toString?.() ??
    "";

  const walletToken = () => {
    return walletStore.query.data?.find((t) => t.address === address);
  };

  const tokenMeta = address ? tokenMetadataQuery(address) : null;

  const displaySymbol = () => {
    const wt = walletToken();
    if (wt) return wt.symbol;
    if (tokenMeta?.data?.symbol) return tokenMeta.data.symbol;
    return assetInfo.label ?? "TOKEN";
  };

  const displayAmount = () => {
    const wt = walletToken();
    if (wt && typeof wt.decimals === "number") {
      return parseBalanceUnits(
        assetInfo.amount_per_link_use_action,
        wt.decimals,
      ).toFixed(5);
    }
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
      {assetInfo.asset.chain}{assetInfo.asset.address
        ? ` - ${String(assetInfo.asset.address)}`
        : ""}
    </div>
  </div>
  <div class="text-right">
    <div class="text-lg font-semibold">{displayAmount()}</div>
    <div class="text-xs text-muted-foreground">per claim</div>
  </div>
</div>
