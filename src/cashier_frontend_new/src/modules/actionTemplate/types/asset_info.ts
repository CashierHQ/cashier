import { type AssetInfo as BackendSharedAssetInfo } from "$lib/generated/cashier_backend/cashier_backend.did";
import {
  SharedAssetMapper,
  type SerializedSharedAsset,
} from "$modules/actionTemplate/types/asset";
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

  /**
   * Convert frontend SharedAssetInfo to serialized storage shape
   * @param assetInfo
   * @returns
   */
  static toStorageType(assetInfo: SharedAssetInfo): SerializedSharedAssetInfo {
    return {
      asset: SharedAssetMapper.toStorageType(assetInfo.asset),
      label: assetInfo.label,
      amount: assetInfo.amount,
    };
  }

  /**
   * Convert serialized storage shape to frontend SharedAssetInfo
   * @param assetInfo
   * @returns
   */
  static fromStorageType(
    assetInfo: SerializedSharedAssetInfo,
  ): SharedAssetInfo {
    return {
      asset: SharedAssetMapper.fromStorageType(assetInfo.asset),
      label: assetInfo.label,
      amount: assetInfo.amount,
    };
  }
}

/**
 * Serialized form of SharedAssetInfo for local storage
 */
export type SerializedSharedAssetInfo = {
  asset: SerializedSharedAsset;
  label: string;
  amount: bigint;
};
