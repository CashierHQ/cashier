import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { FlowDirection } from "$modules/transactionCart/types/transactionSource";
import {
  AssetProcessState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import { Principal } from "@icp-sdk/core/principal";
import type { BitcoinBlock } from "$modules/bitcoin/types/bitcoin_transaction";

/**
 * Enriched BridgeTransaction type with total amount in USD value
 */
export type BridgeTransactionWithUsdValue = BridgeTransaction & {
  total_amount_usd: number;
};

/**
 * Asset-type-specific fields for a bridge transaction.
 */
export type BridgeDetails =
  | { readonly kind: "ckbtc"; ckbtc_block_id: bigint | null }
  | { readonly kind: "runes"; omnity_ticket_id: string | null }
  | { readonly kind: "legacy" };

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
  btc_fee: bigint;
  btc_txid: string | null;
  block_id: bigint | null;
  block_timestamp: bigint | null;
  confirmations: BitcoinBlock[] | [];
  vin: BridgeUtxo[];
  vout: BridgeUtxo[];
  retry_times: number;
  status: BridgeTransactionStatusValue;
  details: BridgeDetails;
};

export type BridgeUtxo = {
  txid: string;
  vout: number;
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
  static readonly Confirmed = "Confirmed";
  static readonly Completed = "Completed";
  static readonly Failed = "Failed";
}

export type BridgeTransactionStatusValue =
  | typeof BridgeTransactionStatus.Created
  | typeof BridgeTransactionStatus.Pending
  | typeof BridgeTransactionStatus.Confirmed
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
    const data_total_amount = data.total_amount as [] | [bigint];
    if (data_total_amount.length === 1) {
      total_amount = data_total_amount[0];
    }
    let deposit_fee = 0n;
    const data_deposit_fee = data.deposit_fee as [] | [bigint];
    if (data_deposit_fee.length === 1) {
      deposit_fee = data_deposit_fee[0];
    }
    let withdrawal_fee = 0n;
    const data_withdrawal_fee = data.withdrawal_fee as [] | [bigint];
    if (data_withdrawal_fee.length === 1) {
      withdrawal_fee = data_withdrawal_fee[0];
    }
    let btc_fee = 0n;
    const data_btc_fee = data.btc_fee as [] | [bigint];
    if (data_btc_fee.length === 1) {
      btc_fee = data_btc_fee[0];
    }

    let btc_txid = null;
    const data_btc_txid = data.btc_txid as [] | [string];
    if (data_btc_txid.length === 1) {
      btc_txid = data_btc_txid[0];
    }

    let ckbtc_block_id = null;
    const data_ckbtc_block_id = data.ckbtc_block_id as [] | [bigint];
    if (data_ckbtc_block_id.length === 1) {
      ckbtc_block_id = data_ckbtc_block_id[0];
    }

    let block_id = null;
    const data_block_id = data.block_id as [] | [bigint];
    if (data_block_id.length === 1) {
      block_id = data_block_id[0];
    }

    let block_timestamp = null;
    const data_block_timestamp = data.block_timestamp as [] | [bigint];
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

    let omnity_ticket_id = null;
    const data_omnity_ticket_id = data.omnity_ticket_id as [] | [string];
    if (data_omnity_ticket_id.length === 1) {
      omnity_ticket_id = data_omnity_ticket_id[0];
    }

    const vin = (data.vin as [] | [tokenStorage.UTXO[]]).flatMap(
      (utxos) => utxos,
    );
    const vout = (data.vout as [] | [tokenStorage.UTXO[]]).flatMap(
      (utxos) => utxos,
    );

    const is_runes = data.asset_infos.some((a) => "Runes" in a.asset_type);
    const details: BridgeDetails = is_runes
      ? { kind: "runes", omnity_ticket_id }
      : { kind: "ckbtc", ckbtc_block_id };

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
      btc_fee,
      btc_txid,
      block_id,
      block_timestamp,
      confirmations,
      vin,
      vout,
      retry_times: data.retry_times,
      status: BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage(
        data.status,
      ),
      details,
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
   * Map frontend BridgeTypeValue to token storage BridgeType canister format
   * @param bridgeType
   * @returns tokenStorage.BridgeType
   */
  public static toBridgeTypeCanister(
    bridgeType: BridgeTypeValue,
  ): tokenStorage.BridgeType {
    if (bridgeType === BridgeType.Import) {
      return { Import: null };
    } else {
      return { Export: null };
    }
  }

  /**
   * Map frontend BridgeAssetTypeValue to token storage BridgeAssetType canister format
   * @param assetType
   * @returns tokenStorage.BridgeAssetType
   */
  public static toBridgeAssetTypeCanister(
    assetType: BridgeAssetTypeValue,
  ): tokenStorage.BridgeAssetType {
    if (assetType === BridgeAssetType.BTC) {
      return { BTC: null };
    } else if (assetType === BridgeAssetType.Runes) {
      return { Runes: null };
    } else {
      return { Ordinals: null };
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
    } else if ("Confirmed" in status) {
      return BridgeTransactionStatus.Confirmed;
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
    const assetItems: AssetItem[] = [];
    let state = AssetProcessState.CREATED;
    if (bridge.status === BridgeTransactionStatus.Completed) {
      state = AssetProcessState.SUCCEED;
    } else if (bridge.status === BridgeTransactionStatus.Failed) {
      state = AssetProcessState.FAILED;
    } else if (
      bridge.status === BridgeTransactionStatus.Pending ||
      bridge.status === BridgeTransactionStatus.Confirmed
    ) {
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
      const symbol = label;
      const amount = assetInfo.amount;
      const amountUi = Number(assetInfo.amount) / 10 ** assetInfo.decimals;
      const amountFormattedStr = formatNumber(amountUi, {
        tofixed: assetInfo.decimals,
      });

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
      case BridgeTransactionStatus.Confirmed:
        return { Confirmed: null };
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
   * @param ckbtc_block_id
   * @param block_id
   * @param block_timestamp
   * @param confirmations
   * @param btc_txid
   * @param deposit_fee
   * @param withdrawal_fee
   * @param btc_fee
   * @param retry_times
   * @returns tokenStorage.UpdateBridgeTransactionInputArg
   */
  public static toUpdateBridgeTransactionArgs(
    bridgeId: string,
    status: BridgeTransactionStatus | null = null,
    ckbtc_block_id: bigint | null = null,
    block_id: bigint | null = null,
    block_timestamp: bigint | null = null,
    confirmations: BitcoinBlock[] | [] = [],
    btc_txid: string | null = null,
    deposit_fee: bigint | null = null,
    withdrawal_fee: bigint | null = null,
    btc_fee: bigint | null = null,
    retry_times: number | null = null,
    omnity_ticket_id: string | null = null,
    vin: BridgeUtxo[] = [],
    vout: BridgeUtxo[] = [],
    asset_infos: BridgeAssetInfo[] = [],
  ): tokenStorage.UpdateBridgeTransactionInputArg {
    const asset_infos_arg: [] | [tokenStorage.BridgeAssetInfo[]] =
      asset_infos.length > 0
        ? [
            asset_infos.map((assetInfo) => ({
              asset_type: BridgeTransactionMapper.toBridgeAssetTypeCanister(
                assetInfo.asset_type,
              ),
              asset_id: assetInfo.asset_id,
              amount: assetInfo.amount,
              decimals: assetInfo.decimals,
            })),
          ]
        : [];
    const ckbtc_block_id_arg: [] | [bigint] =
      ckbtc_block_id !== null ? [ckbtc_block_id] : [];
    const block_id_arg: [] | [bigint] = block_id !== null ? [block_id] : [];
    const block_timestamp_arg: [] | [bigint] =
      block_timestamp !== null ? [block_timestamp] : [];
    const block_confirmations = confirmations.map((block) => ({
      block_id: block.block_id,
      block_timestamp: block.block_timestamp,
    }));
    const block_confirmations_arg: [] | [tokenStorage.BlockConfirmation[]] =
      block_confirmations.length > 0 ? [block_confirmations] : [];
    const btc_txid_arg: [] | [string] = btc_txid !== null ? [btc_txid] : [];
    const deposit_fee_arg: [] | [bigint] =
      deposit_fee !== null ? [deposit_fee] : [];
    const withdrawal_fee_arg: [] | [bigint] =
      withdrawal_fee !== null ? [withdrawal_fee] : [];
    const btc_fee_arg: [] | [bigint] = btc_fee !== null ? [btc_fee] : [];
    const retry_times_arg: [] | [number] =
      retry_times !== null ? [retry_times] : [];
    const omnity_ticket_id_arg: [] | [string] =
      omnity_ticket_id !== null ? [omnity_ticket_id] : [];
    const vin_arg: [] | [tokenStorage.UTXO[]] = vin.length > 0 ? [vin] : [];
    const vout_arg: [] | [tokenStorage.UTXO[]] = vout.length > 0 ? [vout] : [];

    return {
      asset_infos: asset_infos_arg,
      vin: vin_arg,
      bridge_id: bridgeId,
      status: status
        ? [BridgeTransactionMapper.toBridgeTransactionStatusCanister(status)]
        : [],
      ckbtc_block_id: ckbtc_block_id_arg,
      block_id: block_id_arg,
      block_timestamp: block_timestamp_arg,
      block_confirmations: block_confirmations_arg,
      vout: vout_arg,
      btc_txid: btc_txid_arg,
      omnity_ticket_id: omnity_ticket_id_arg,
      deposit_fee: deposit_fee_arg,
      withdrawal_fee: withdrawal_fee_arg,
      btc_fee: btc_fee_arg,
      retry_times: retry_times_arg,
    };
  }

  /**
   * Create export bridge transaction input argument
   * @param icpAddress
   * @param btcAddress
   * @param amount
   * @param withdrawalFee
   * @param btcFee
   * @returns tokenStorage.CreateBridgeTransactionInputArg
   */
  public static toCreateExportBridgeTransactionArgs(
    icpAddress: string,
    btcAddress: string,
    amount: bigint,
    withdrawalFee: bigint,
    btcFee: bigint,
  ): tokenStorage.CreateBridgeTransactionInputArg {
    return {
      vin: [],
      btc_txid: [],
      icp_address: Principal.fromText(icpAddress),
      btc_address: btcAddress,
      asset_infos: [
        {
          asset_type: { BTC: null },
          asset_id: CKBTC_CANISTER_ID,
          amount,
          decimals: 8,
        },
      ],
      bridge_type: { Export: null },
      vout: [],
      deposit_fee: [],
      withdrawal_fee: [withdrawalFee],
      btc_fee: [btcFee],
      created_at_ts: BigInt(Math.floor(Date.now() / 1000)),
      ckbtc_block_id: [],
      status: [],
      omnity_ticket_id: [],
    };
  }

  /**
   * Create export bridge transaction input argument for Rune assets
   * @param icpAddress
   * @param btcAddress
   * @param runeId
   * @param amount
   * @param decimals
   * @returns
   */
  public static toCreateRuneExportBridgeTransactionArgs(
    icpAddress: string,
    btcAddress: string,
    runeId: string,
    amount: bigint,
    decimals: number,
    withdrawalFee: bigint,
  ): tokenStorage.CreateBridgeTransactionInputArg {
    return {
      vin: [],
      btc_txid: [],
      icp_address: Principal.fromText(icpAddress),
      btc_address: btcAddress,
      asset_infos: [
        {
          asset_type: { Runes: null },
          asset_id: runeId,
          amount,
          decimals,
        },
      ],
      bridge_type: { Export: null },
      vout: [],
      deposit_fee: [],
      withdrawal_fee: [withdrawalFee],
      btc_fee: [],
      created_at_ts: BigInt(Math.floor(Date.now() / 1000)),
      ckbtc_block_id: [],
      status: [{ Created: null }],
      omnity_ticket_id: [],
    };
  }
}
