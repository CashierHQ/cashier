import { type Link as BackendSharedLink } from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedAssetInfoMapper } from "$modules/actionTemplate/types/asset_info";
import { SharedLinkStateMapper } from "$modules/actionTemplate/types/link_state";
import { SharedLinkTypeMapper } from "$modules/actionTemplate/types/link_type";
import type { Link as SharedLink } from "$shared";

/**
 * Mapper for converting between frontend SharedLink and backend Link
 */
export class SharedLinkMapper {
  /**
   * Convert frontend SharedLink to corresponding backend Link
   * @param link
   * @returns
   */
  static toBackendType(link: SharedLink): BackendSharedLink {
    let asset_info = link.asset_info.map(SharedAssetInfoMapper.toBackendType);
    return {
      id: link.id,
      title: link.title,
      link_type: SharedLinkTypeMapper.toBackendType(link.link_type),
      creator: link.creator,
      asset_info,
      max_use: link.max_use,
      use_count: link.use_count,
      created_at_ts: link.created_at_ts ? [link.created_at_ts] : [],
      link_state: SharedLinkStateMapper.toBackendType(link.link_state),
    };
  }

  /**
   * Convert backend Link to corresponding frontend SharedLink
   * @param action
   * @returns
   */
  static toLocalType(action: BackendSharedLink): SharedLink {
    let asset_info = action.asset_info.map(SharedAssetInfoMapper.toLocalType);
    return {
      id: action.id,
      title: action.title,
      link_type: SharedLinkTypeMapper.toLocalType(action.link_type),
      creator: action.creator,
      asset_info,
      max_use: action.max_use,
      use_count: action.use_count,
      created_at_ts:
        action.created_at_ts.length > 0 ? action.created_at_ts[0] : undefined,
      link_state: SharedLinkStateMapper.toLocalType(action.link_state),
    };
  }
}
