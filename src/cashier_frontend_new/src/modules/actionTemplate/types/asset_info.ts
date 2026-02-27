import { type AssetInfo as BackendSharedAssetInfo } from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedAssetMapper } from "$modules/actionTemplate/types/asset";
import { type AssetInfo as SharedAssetInfo } from "$shared";

/**
 * Mapper for converting between frontend SharedAssetInfo and backend AssetInfo
 */
export class SharedAssetInfoMapper {
  /**
   * Convert frontend SharedAssetInfo to corresponding backend AssetInfo
   * @param assetInfo
   * @returns
   */
  static toBackendType(assetInfo: SharedAssetInfo): BackendSharedAssetInfo {
    return {
      asset: SharedAssetMapper.toBackendType(assetInfo.asset),
      label: assetInfo.label,
      amount: assetInfo.amount,
    };
  }

  /**
   * Convert backend AssetInfo to corresponding frontend SharedAssetInfo
   * @param assetInfo
   * @returns
   */
  static toLocalType(assetInfo: BackendSharedAssetInfo): SharedAssetInfo {
    return {
      asset: SharedAssetMapper.toLocalType(assetInfo.asset),
      label: assetInfo.label,
      amount: assetInfo.amount,
    };
  }
}
