import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";

export type BridgeTransaction = {
  icp_address: string;
  btc_address: string;
  asset_infos: Array<BridgeAssetInfo>;
  created_at_ts: bigint;
};

export type BridgeAssetInfo = {
  asset_type: BridgeAssetTypeValue;
  asset_id: string;
  ledger_id: string;
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

export class BridgeTransactionMapper {
  public static fromTokenStorageBridgeTransaction(
    data: tokenStorage.UserBridgeTransactionDto,
  ): BridgeTransaction {
    return {
      icp_address: data.icp_address.toText(),
      btc_address: data.btc_address,
      asset_infos: data.asset_infos.map((assetInfo) => ({
        asset_type: BridgeTransactionMapper.bridgeAssetTypeFromTokenStorage(
          assetInfo.asset_type,
        ),
        asset_id: assetInfo.asset_id,
        ledger_id: assetInfo.ledger_id.toText(),
        amount: assetInfo.amount,
        decimals: assetInfo.decimals,
      })),
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
}
