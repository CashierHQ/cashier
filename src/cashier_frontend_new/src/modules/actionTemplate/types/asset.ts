import { type Asset as BackendSharedAsset } from "$lib/generated/cashier_backend/cashier_backend.did";
import {
  SharedTokenStandardMapper,
  type SharedTokenStandardValue,
} from "$modules/actionTemplate/types/token_standard";
import { type Asset as SharedAsset } from "$shared";
import { Principal } from "@icp-sdk/core/principal";

/**
 * Mapper for converting between frontend SharedAsset and backend Asset
 */
export class SharedAssetMapper {
  /**
   * Convert frontend SharedAsset to corresponding backend Asset
   * @param asset
   * @returns
   */
  static toBackendType(asset: SharedAsset): BackendSharedAsset {
    return {
      address: asset.address,
      network_fee: asset.network_fee ? [asset.network_fee] : [],
      token_standard: asset.token_standard
        ? [SharedTokenStandardMapper.toBackendType(asset.token_standard)]
        : [],
    };
  }

  /**
   * Convert backend Asset to corresponding frontend SharedAsset
   * @param asset
   * @returns
   */
  static toLocalType(asset: BackendSharedAsset): SharedAsset {
    return {
      address: asset.address,
      network_fee:
        asset.network_fee.length > 0 ? asset.network_fee[0] : undefined,
      token_standard:
        asset.token_standard.length > 0 && asset.token_standard[0] !== undefined
          ? SharedTokenStandardMapper.toLocalType(asset.token_standard[0])
          : undefined,
    };
  }

  /**
   * Convert frontend SharedAsset to serialized storage shape
   * @param asset
   * @returns
   */
  static toStorageType(asset: SharedAsset): SerializedSharedAsset {
    return {
      address: asset.address.toText(),
      network_fee: asset.network_fee,
      token_standard: asset.token_standard,
    };
  }

  /**
   * Convert serialized storage shape to frontend SharedAsset
   * @param asset
   * @returns
   */
  static fromStorageType(asset: SerializedSharedAsset): SharedAsset {
    return {
      address: Principal.fromText(asset.address),
      network_fee: asset.network_fee,
      token_standard: asset.token_standard,
    };
  }
}

/**
 * Serialized form of SharedAsset for local storage
 */
export type SerializedSharedAsset = {
  address: string;
  network_fee?: bigint;
  token_standard?: SharedTokenStandardValue;
};
