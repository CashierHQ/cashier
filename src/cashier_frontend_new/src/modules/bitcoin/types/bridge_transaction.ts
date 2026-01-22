import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { FlowDirection } from "$modules/transactionCart/types/transactionSource";
import {
  AssetProcessState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";

export type BridgeTransactionWithUsdValue = BridgeTransaction & {
  total_amount_usd: number;
};

export type BridgeTransaction = {
  bridge_id: string;
  icp_address: string;
  btc_address: string;
  asset_infos: Array<BridgeAssetInfo>;
  bridge_type: BridgeTypeValue;
  total_amount: bigint;
  created_at_ts: bigint;
  deposit_fee: bigint;
  withdrawal_fee: bigint;
  status: BridgeTransactionStatusValue;
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

export class BridgeTransactionStatus {
  static readonly Created = "Created";
  static readonly Pending = "Pending";
  static readonly Completed = "Completed";
  static readonly Failed = "Failed";
}

export type BridgeTransactionStatusValue =
  | typeof BridgeTransactionStatus.Created
  | typeof BridgeTransactionStatus.Pending
  | typeof BridgeTransactionStatus.Completed
  | typeof BridgeTransactionStatus.Failed;

export class BridgeTransactionMapper {
  public static fromTokenStorageBridgeTransaction(
    data: tokenStorage.UserBridgeTransactionDto,
  ): BridgeTransaction {
    let total_amount = 0n;
    let data_total_amount = data.total_amount as [] | [bigint];
    if (data_total_amount.length === 1) {
      total_amount = data_total_amount[0];
    }
    let deposit_fee = 0n;
    let data_deposit_fee = data.deposit_fee as [] | [bigint];
    if (data_deposit_fee.length === 1) {
      deposit_fee = data_deposit_fee[0];
    }
    let withdrawal_fee = 0n;
    let data_withdrawal_fee = data.withdrawal_fee as [] | [bigint];
    if (data_withdrawal_fee.length === 1) {
      withdrawal_fee = data_withdrawal_fee[0];
    }

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
      total_amount,
      created_at_ts: data.created_at_ts,
      deposit_fee,
      withdrawal_fee,
      status: BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage(
        data.status,
      ),
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

  public static bridgeTransactionStatusFromTokenStorage(
    status: tokenStorage.BridgeTransactionStatus,
  ): BridgeTransactionStatusValue {
    if ("Created" in status) {
      return BridgeTransactionStatus.Created;
    } else if ("Pending" in status) {
      return BridgeTransactionStatus.Pending;
    } else if ("Completed" in status) {
      return BridgeTransactionStatus.Completed;
    } else if ("Failed" in status) {
      return BridgeTransactionStatus.Failed;
    } else {
      throw new Error("Unknown BridgeTransactionStatus");
    }
  }

  public static toAssetItems(bridge: BridgeTransaction): AssetItem[] {
    let assetItems: AssetItem[] = [];
    let state = AssetProcessState.CREATED;
    if (bridge.status === BridgeTransactionStatus.Completed) {
      state = AssetProcessState.SUCCEED;
    } else if (bridge.status === BridgeTransactionStatus.Failed) {
      state = AssetProcessState.FAILED;
    } else if (bridge.status === BridgeTransactionStatus.Pending) {
      state = AssetProcessState.PROCESSING;
    }
    let direction = FlowDirection.INCOMING;
    if (bridge.bridge_type === BridgeType.Export) {
      direction = FlowDirection.OUTGOING;
    }

    bridge.asset_infos.forEach((assetInfo) => {
      let label = "N/A";
      let address = "N/A";
      if (assetInfo.asset_type === BridgeAssetType.BTC) {
        label = "BTC";
        address = CKBTC_CANISTER_ID;
      } else if (assetInfo.asset_type === BridgeAssetType.Runes) {
        label = "Runes";
      } else if (assetInfo.asset_type === BridgeAssetType.Ordinals) {
        label = "Ordinals";
      }
      let symbol = label;
      let amount = assetInfo.amount;
      let amountFormattedStr = (
        Number(assetInfo.amount) /
        10 ** assetInfo.decimals
      ).toFixed(assetInfo.decimals);

      assetItems.push({
        state,
        label,
        symbol,
        address,
        amount,
        amountFormattedStr,
        direction,
      });
    });

    return assetItems;
  }
}
