import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { FlowDirection } from "$modules/transactionCart/types/transactionSource";
import {
  AssetProcessState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import type { BitcoinBlock } from "./bitcoin_transaction";

/**
 * Enriched BridgeTransaction type with total amount in USD value
 */
export type BridgeTransactionWithUsdValue = BridgeTransaction & {
  total_amount_usd: number;
};

/**
 * BridgeTransaction type representing a bridge transaction between Bitcoin and ICP
 */
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
  btc_txid: string | null;
  block_id: bigint | null;
  block_timestamp: bigint | null;
  confirmations: BitcoinBlock[] | [];
  retry_times: number;
  status: BridgeTransactionStatusValue;
};

/**
 * BridgeAssetInfo type representing asset details in a bridge transaction
 */
export type BridgeAssetInfo = {
  asset_type: BridgeAssetTypeValue;
  asset_id: string;
  amount: bigint;
  decimals: number;
};

/**
 * BridgeAssetType enum representing types of assets in bridge transactions
 */
export class BridgeAssetType {
  static readonly BTC = "BTC";
  static readonly Runes = "Runes";
  static readonly Ordinals = "Ordinals";
}

export type BridgeAssetTypeValue =
  | typeof BridgeAssetType.BTC
  | typeof BridgeAssetType.Runes
  | typeof BridgeAssetType.Ordinals;

/**
 * BridgeType enum representing types of bridge transactions
 */
export class BridgeType {
  static readonly Import = "Import";
  static readonly Export = "Export";
}

export type BridgeTypeValue =
  | typeof BridgeType.Import
  | typeof BridgeType.Export;

/**
 * BridgeTransactionStatus enum representing status of bridge transactions
 */
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

/**
 * Mapper class to convert between token storage bridge transactions and frontend BridgeTransaction type
 */
export class BridgeTransactionMapper {
  /**
   * Map token storage bridge transaction to frontend bridge transaction type
   * @param data UserBridgeTransactionDto from token storage canister
   * @returns BridgeTransaction
   */
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

    let btc_txid = null;
    let data_btc_txid = data.btc_txid as [] | [string];
    if (data_btc_txid.length === 1) {
      btc_txid = data_btc_txid[0];
    }

    let block_id = null;
    let data_block_id = data.block_id as [] | [bigint];
    if (data_block_id.length === 1) {
      block_id = data_block_id[0];
    }

    let block_timestamp = null;
    let data_block_timestamp = data.block_timestamp as [] | [bigint];
    if (data_block_timestamp.length === 1) {
      block_timestamp = data_block_timestamp[0];
    }

    let confirmations: BitcoinBlock[] = [];
    if (data.block_confirmations.length > 0) {
      confirmations = data.block_confirmations.map((conf) => ({
        block_id: conf.block_id,
        block_timestamp: conf.block_timestamp,
      }));
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
      btc_txid,
      block_id,
      block_timestamp,
      confirmations,
      retry_times: data.retry_times,
      status: BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage(
        data.status,
      ),
    };
  }

  /**
   * Map token storage BridgeAssetType to frontend BridgeAssetTypeValue
   * @param assetType
   * @returns BridgeAssetTypeValue
   */
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

  /**
   * Map token storage BridgeType to frontend BridgeTypeValue
   * @param bridgeType
   * @returns BridgeTypeValue
   */
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

  /**
   * Map token storage BridgeTransactionStatus to frontend BridgeTransactionStatusValue
   * @param status
   * @returns BridgeTransactionStatusValue
   */
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

  /**
   * Map frontend BridgeTransaction to AssetItem array for transaction cart display
   * @param bridge
   * @returns array of AssetItem
   */
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

  /**
   * Map frontend BridgeTransactionStatus to token storage BridgeTransactionStatus
   * @param status
   * @returns tokenStorage.BridgeTransactionStatus
   */
  public static toBridgeTransactionStatusCanister(
    status: BridgeTransactionStatus,
  ): tokenStorage.BridgeTransactionStatus {
    switch (status) {
      case BridgeTransactionStatus.Created:
        return { Created: null };
      case BridgeTransactionStatus.Pending:
        return { Pending: null };
      case BridgeTransactionStatus.Completed:
        return { Completed: null };
      case BridgeTransactionStatus.Failed:
        return { Failed: null };
      default:
        throw new Error("Unknown BridgeTransactionStatusValue");
    }
  }

  /**
   * Map frontend BridgeTransaction update to token storage UpdateBridgeTransactionInputArg
   * @param bridgeId
   * @param status
   * @param block_id
   * @param block_timestamp
   * @param confirmations
   * @param btc_txid
   * @param deposit_fee
   * @param withdrawal_fee
   * @param retry_times
   * @returns tokenStorage.UpdateBridgeTransactionInputArg
   */
  public static toUpdateBridgeTransactionArgs(
    bridgeId: string,
    status: BridgeTransactionStatus | null = null,
    block_id: bigint | null = null,
    block_timestamp: bigint | null = null,
    confirmations: BitcoinBlock[] | [] = [],
    btc_txid: string | null = null,
    deposit_fee: bigint | null = null,
    withdrawal_fee: bigint | null = null,
    retry_times: number | null = null,
  ): tokenStorage.UpdateBridgeTransactionInputArg {
    let block_id_arg: [] | [bigint] = block_id ? [block_id] : [];
    let block_timestamp_arg: [] | [bigint] = block_timestamp
      ? [block_timestamp]
      : [];
    let block_confirmations = confirmations.map((block) => ({
      block_id: block.block_id,
      block_timestamp: block.block_timestamp,
    }));
    let block_confirmations_arg: [] | [tokenStorage.BlockConfirmation[]] =
      block_confirmations.length > 0 ? [block_confirmations] : [];

    return {
      bridge_id: bridgeId,
      status: status
        ? [BridgeTransactionMapper.toBridgeTransactionStatusCanister(status)]
        : [],
      block_id: block_id_arg,
      block_timestamp: block_timestamp_arg,
      block_confirmations: block_confirmations_arg,
      btc_txid: btc_txid ? [btc_txid] : [],
      deposit_fee: deposit_fee ? [deposit_fee] : [],
      withdrawal_fee: withdrawal_fee ? [withdrawal_fee] : [],
      retry_times: retry_times ? [retry_times] : [],
    };
  }
}
