import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";
import { AssetInfo, AssetInfoMapper } from "$modules/links/types/link/asset";
import { Link } from "$modules/links/types/link/link";
import { LinkState } from "$modules/links/types/link/linkState";
import { LinkTypeMapper } from "$modules/links/types/link/linkType";

/**
 * Map V3 backend LinkState_1 (Created|Active|Inactive|Ended) to frontend LinkState.
 */
function mapV3LinkStateToFrontend(
  state: cashierBackend.LinkState_1,
): import("$modules/links/types/link/linkState").LinkStateValue {
  return rsMatch(state, {
    Created: () => LinkState.CREATE_LINK,
    Active: () => LinkState.ACTIVE,
    Inactive: () => LinkState.INACTIVE,
    Ended: () => LinkState.INACTIVE_ENDED,
    ChooseType: () => LinkState.INACTIVE,
    AddAsset: () => LinkState.INACTIVE,
    Preview: () => LinkState.INACTIVE,
  });
}

/**
 * Map V3 backend AssetInfo (asset, label, amount) to frontend AssetInfo.
 * V3 uses amount, frontend uses amount_per_link_use_action.
 */
function mapV3AssetInfo(
  info: cashierBackend.AssetInfo,
): InstanceType<typeof import("$modules/links/types/link/asset").AssetInfo> {
  return new AssetInfo(
    AssetInfoMapper.fromBackendType({
      asset: { IC: { address: info.asset.address } },
      amount_per_link_use_action: info.amount,
      label: info.label,
    }).asset,
    info.amount,
    info.label,
    info.available_amount.length > 0 ? info.available_amount[0] : undefined,
  );
}

/**
 * Convert V3 backend Link to frontend Link.
 * V3 has use_count, max_use - maps to link_use_action_counter, link_use_action_max_count.
 * created_at (nanoseconds, Candid Opt) maps to create_at for date display.
 */
export function mapV3LinkToFrontend(v3Link: cashierBackend.Link): Link {
  const raw = v3Link as { created_at?: [] | [bigint] };
  const createdAt = Array.isArray(raw.created_at)
    ? raw.created_at[0]
    : undefined;
  const createAt = createdAt !== undefined ? BigInt(createdAt) : 0n;
  return new Link(
    v3Link.id,
    v3Link.title,
    v3Link.creator,
    v3Link.asset_info.map((a) => mapV3AssetInfo(a)),
    LinkTypeMapper.fromBackendType(v3Link.link_type),
    createAt,
    mapV3LinkStateToFrontend(v3Link.link_state),
    v3Link.max_use,
    v3Link.use_count,
  );
}
