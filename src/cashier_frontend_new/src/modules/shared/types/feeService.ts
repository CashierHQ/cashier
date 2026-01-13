import type Action from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import type { IntentStateValue } from "$modules/links/types/action/intentState";
import IntentTask from "$modules/links/types/action/intentTask";
import type { IntentPayload } from "$modules/links/types/action/intentType";
import {
  FeeType,
  type ComputeAmountAndFeeInput,
  type ComputeAmountAndFeeOutput,
  type FeeItem,
} from "$modules/links/types/fee";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import { ICP_LEDGER_FEE } from "$modules/token/constants";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import {
  FlowDirection,
  type FlowDirectionValue,
} from "$modules/transactionCart/types/transaction-source";
import {
  AssetProcessState,
  AssetProcessStateMapper,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";

// Type for paired AssetItem and FeeItem
export type AssetAndFee = {
  asset: AssetItem;
  fee?: FeeItem;
};

export type ForecastAssetAndFee = {
  asset: {
    label: string;
    symbol: string;
    address: string;
    /** in formmated string */
    amount: string;
    /** in formmated string */
    usdValueStr?: string;
  };
  fee?: FeeItem;
};

export type AssetAndFeeList = AssetAndFee[];

/**
 * Input type for wallet transfer to asset mapping
 */
export type WalletAssetInput = {
  amount: bigint;
  tokenAddress: string;
};

/**
 * Mapper for creating AssetAndFeeList from various sources.
 * Static methods - no FeeService dependency.
 */
export class AssetAndFeeListMapper {
  /**
   * Compute flow direction from intent payload.
   * @param payload IntentPayload
   * @param currentWalletPrincipal Principal of the current user's wallet
   * @return FlowDirectionValue
   * @throws Error if user is neither sender nor receiver
   */
  static getFlowDirection(
    payload: IntentPayload,
    currentWalletPrincipal: string,
  ): FlowDirectionValue {
    const toAddress = payload.to.address.toText();
    const fromAddress = payload.from.address.toText();
    if (fromAddress === currentWalletPrincipal) return FlowDirection.OUTGOING;
    if (toAddress === currentWalletPrincipal) return FlowDirection.INCOMING;
    throw new Error("User is neither sender nor receiver");
  }

  /**
   * Compute amount and fee based on action type.
   * @param input ComputeAmountAndFeeInput
   * @return ComputeAmountAndFeeOutput
   */
  static computeAmountAndFee(
    input: ComputeAmountAndFeeInput,
  ): ComputeAmountAndFeeOutput {
    const { intent, ledgerFee, actionType } = input;
    switch (actionType) {
      case ActionType.CREATE_LINK:
        if (intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY) {
          const total = ledgerFee * 2n + intent.type.payload.amount;
          return { amount: total, fee: total };
        }
        return {
          amount: ledgerFee + intent.type.payload.amount,
          fee: ledgerFee,
        };
      case ActionType.WITHDRAW:
        return { amount: intent.type.payload.amount, fee: ledgerFee };
      case ActionType.SEND:
        return {
          amount: intent.type.payload.amount + ledgerFee,
          fee: ledgerFee,
        };
      case ActionType.RECEIVE:
        return { amount: intent.type.payload.amount, fee: undefined };
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Map Action to AssetAndFeeList.
   * @param action Action containing intents
   * @param tokens Map of token address to TokenWithPriceAndBalance
   * @param currentWalletPrincipal Principal of the current user's wallet
   * @return AssetAndFeeList
   */
  static fromAction(
    action: Action,
    tokens: Record<string, TokenWithPriceAndBalance>,
    currentWalletPrincipal: string,
  ): AssetAndFeeList {
    return action.intents.map((intent) => {
      const address = intent.type.payload.asset.address.toString();
      const token = tokens[address];
      const direction = AssetAndFeeListMapper.getFlowDirection(
        intent.type.payload,
        currentWalletPrincipal,
      );

      let feeType = FeeType.NETWORK_FEE;
      if (
        action.type === ActionType.CREATE_LINK &&
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
      ) {
        feeType = FeeType.CREATE_LINK_FEE;
      }
      const label =
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
          ? "Create link fee"
          : "";

      const ledgerFee = token?.fee ?? ICP_LEDGER_FEE;
      const { amount: forecastAmount, fee: feeRaw } =
        AssetAndFeeListMapper.computeAmountAndFee({
          intent,
          ledgerFee,
          actionType: action.type,
        });

      const decimals = token?.decimals ?? 8;
      const symbol = token?.symbol ?? "N/A";
      const amountUi = parseBalanceUnits(forecastAmount, decimals);
      const amountUsd = token?.priceUSD ? amountUi * token.priceUSD : undefined;

      const asset: AssetItem = {
        state: token
          ? AssetProcessStateMapper.fromIntentState(
              intent.state as IntentStateValue,
            )
          : AssetProcessState.PROCESSING,
        label,
        symbol,
        address,
        amount: forecastAmount,
        amountFormattedStr: token
          ? formatNumber(amountUi)
          : amountUi.toString(),
        usdValueStr: amountUsd ? formatUsdAmount(amountUsd) : undefined,
        direction,
        intentId: intent.id,
      };

      let fee: FeeItem | undefined;
      if (feeRaw !== undefined) {
        const feeUi = parseBalanceUnits(feeRaw, decimals);
        const feeUsd = token?.priceUSD ? feeUi * token.priceUSD : undefined;
        fee = {
          feeType,
          amount: feeRaw,
          amountFormattedStr: token ? formatNumber(feeUi) : feeUi.toString(),
          symbol,
          price: token?.priceUSD,
          usdValue: feeUsd,
          usdValueStr: feeUsd ? formatUsdAmount(feeUsd) : undefined,
        };
      }

      return { asset, fee };
    });
  }

  /**
   * Map wallet transfer to AssetAndFeeList.
   * @param input WalletAssetInput
   * @param tokens Map of token address to TokenWithPriceAndBalance
   * @return AssetAndFeeList
   */
  static fromWallet(
    input: WalletAssetInput,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): AssetAndFeeList {
    const { amount, tokenAddress } = input;
    const token = tokens[tokenAddress];
    if (!token) {
      console.error(
        "Failed to resolve token for wallet transfer:",
        tokenAddress,
      );
      return [];
    }

    const fee = token.fee ?? ICP_LEDGER_FEE;
    const totalAmount = amount + fee;
    const totalUi = parseBalanceUnits(totalAmount, token.decimals);
    const feeUi = parseBalanceUnits(fee, token.decimals);

    return [
      {
        asset: {
          state: AssetProcessState.CREATED,
          label: "",
          symbol: token.symbol,
          address: tokenAddress,
          amount: totalAmount,
          amountFormattedStr: formatNumber(totalUi),
          usdValueStr: token.priceUSD
            ? formatUsdAmount(totalUi * token.priceUSD)
            : undefined,
          direction: FlowDirection.OUTGOING,
        },
        fee: {
          feeType: FeeType.NETWORK_FEE,
          amount: fee,
          amountFormattedStr: formatNumber(feeUi),
          symbol: token.symbol,
          usdValue: token.priceUSD ? feeUi * token.priceUSD : undefined,
        },
      },
    ];
  }
}
