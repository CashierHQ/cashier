import type { Link } from "$modules/links/types/link/link";
import type { FindTokenByAddress } from "$modules/links/utils/feesBreakdown";
import {
  calculateAssetsWithTokenInfo,
  type AssetWithTokenInfo,
} from "$modules/links/utils/feesBreakdown";

/**
 * Calculates the usage info assets with token info for a given link.
 * @param link The link object containing asset information.
 * @param findTokenByAddress Function to find token information by address.
 * @returns An array of assets with token information.
 */
export function calculateUsageInfoAssetsWithTokenInfo(
  link: Link | undefined,
  findTokenByAddress: FindTokenByAddress,
): AssetWithTokenInfo[] {
  if (!link?.asset_info?.length) {
    return [];
  }

  const remainingUses = BigInt(
    Math.max(
      0,
      Number(link.link_use_action_max_count) -
        Number(link.link_use_action_counter),
    ),
  );

  const assets = link.asset_info
    .map((assetInfo) => {
      const assetAddress = assetInfo.asset.address?.toString();
      if (!assetAddress) return null;

      const amount =
        assetInfo.available_amount ??
        assetInfo.amount_per_link_use_action * remainingUses;

      return {
        address: assetAddress,
        amount,
      };
    })
    .filter(
      (item): item is { address: string; amount: bigint } => item !== null,
    );

  return calculateAssetsWithTokenInfo(assets, findTokenByAddress);
}
