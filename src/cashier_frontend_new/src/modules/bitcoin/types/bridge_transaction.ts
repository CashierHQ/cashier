import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";

export type BridgeTransaction = {
  bridge_id: string;
  icp_address: string;
  btc_address: string;
  asset_infos: Array<BridgeAssetInfo>;
  bridge_type: BridgeTypeValue;
  total_amount: bigint;
  created_at_ts: bigint;
};

export type BridgeAssetInfo = {
  asset_type: BridgeAssetTypeValue;
  asset_id: string;
  amount: bigint;
  decimals: number;
};

class BridgeAssetType {
  static readonly BTC = "BTC";
  static readonly Runes = "Runes";
  static readonly Ordinals = "Ordinals";
}

export type BridgeAssetTypeValue =
  | typeof BridgeAssetType.BTC
  | typeof BridgeAssetType.Runes
  | typeof BridgeAssetType.Ordinals;

export class BridgeType {
  static readonly Import = "Import";
  static readonly Export = "Export";
}

export type BridgeTypeValue =
  | typeof BridgeType.Import
  | typeof BridgeType.Export;

export class BridgeTransactionMapper {
  public static fromTokenStorageBridgeTransaction(
    data: tokenStorage.UserBridgeTransactionDto,
  ): BridgeTransaction {
    return {
      bridge_id: data.bridge_id,
      icp_address: data.icp_address.toText(),
      btc_address: data.btc_address,
      asset_infos: data.asset_infos.map((assetInfo) => ({
        asset_type: BridgeTransactionMapper.bridgeAssetTypeFromTokenStorage(
          assetInfo.asset_type,
        ),
        asset_id: assetInfo.asset_id,
        amount: assetInfo.amount,
        decimals: assetInfo.decimals,
      })),
      bridge_type: BridgeTransactionMapper.bridgeTypeFromTokenStorage(
        data.bridge_type,
      ),
      total_amount: data.total_amount,
      created_at_ts: data.created_at_ts,
    };
  }

  public static bridgeAssetTypeFromTokenStorage(
    assetType: tokenStorage.BridgeAssetType,
  ): BridgeAssetTypeValue {
    if ("BTC" in assetType) {
      return BridgeAssetType.BTC;
    } else if ("Runes" in assetType) {
      return BridgeAssetType.Runes;
    } else if ("Ordinals" in assetType) {
      return BridgeAssetType.Ordinals;
    } else {
      throw new Error("Unknown BridgeAssetType");
    }
  }

  public static bridgeTypeFromTokenStorage(
    bridgeType: tokenStorage.BridgeType,
  ): BridgeTypeValue {
    if ("Import" in bridgeType) {
      return BridgeType.Import;
    } else if ("Export" in bridgeType) {
      return BridgeType.Export;
    } else {
      throw new Error("Unknown BridgeType");
    }
  }
}
