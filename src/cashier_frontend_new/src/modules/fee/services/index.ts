import Action from "$modules/links/types/action/action";
import { ICP_LEDGER_FEE } from "$modules/token/constants";
import { ActionType } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import {
  type AssetItem,
  AssetProcessState,
} from "$modules/links/components/txCart/type";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { FeeType, type FeeItem } from "../type";

import { assertUnreachable } from "$lib/rsMatch";
import type {
  ComputeAmountAndFeeInput,
  ComputeAmountAndFeeOutput,
} from "./type";

// Type for paired AssetItem and FeeItem
type AssetAndFeeList = {
  asset: AssetItem;
  fee?: FeeItem;
}[];

export class FeeService {
  /**
   * Compute both the final amount (what will be shown as the asset amount)
   * and an optional fee (undefined when there is no fee to display) based
   * on the provided rules.
   *
   * Rules implemented (assumption: the 4th rule refers to ActionType.Receive)
   * 1) CreateLink + TransferWalletToTreasury: amount = ledgerFee*2 + payload.amount
   *    fee = ledgerFee*2 + payload.amount
   * 2) CreateLink + other intent: amount = ledgerFee + payload.amount
   *    fee = ledgerFee
   * 3) Withdraw: amount = payload.amount - ledgerFee
   *    fee = ledgerFee
      import type Intent from "$modules/links/types/action/intent";
   * 4) Receive: amount = payload.amount
   *    fee = undefined
   */
  computeAmountAndFee({
    intent,
    ledgerFee,
    actionType,
  }: ComputeAmountAndFeeInput): ComputeAmountAndFeeOutput {
    let output: ComputeAmountAndFeeOutput;
    switch (actionType) {
      case ActionType.CreateLink:
        if (intent.task === IntentTask.TransferWalletToTreasury) {
          const total = ledgerFee * 2n + intent.type.payload.amount;
          output = { amount: total, fee: total };
        } else {
          output = {
            amount: ledgerFee + intent.type.payload.amount,
            fee: ledgerFee,
          };
        }
        break;
      case ActionType.Withdraw:
        output = {
          amount: intent.type.payload.amount - ledgerFee,
          fee: ledgerFee,
        };
        break;
      case ActionType.Send:
        output = {
          amount: intent.type.payload.amount + ledgerFee,
          fee: ledgerFee,
        };
        break;
      case ActionType.Receive:
        output = { amount: intent.type.payload.amount, fee: undefined };
        break;
      case ActionType.Use:
        output = { amount: intent.type.payload.amount, fee: undefined };
        break;
      default:
        return assertUnreachable(actionType as never);
    }

    return output;
  }

  /**
   * Map an Action to a list of paired AssetItem and FeeItem for each intent.
   * @param action
   * @returns Array of Asset and Fee pairs
   */
  // Now accepts a tokens map keyed by token address. This removes any
  // dependence on WalletStore inside this method — callers should pass the
  // current tokens (e.g. from `walletStore.query.data`) as a record.
  mapActionToAssetAndFeeList(
    action: Action,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): AssetAndFeeList {
    const pairs: AssetAndFeeList = action.intents.map((intent) => {
      const address = intent.type.payload.asset.address.toString();

      // Determine fee type
      let feeType = FeeType.NETWORK_FEE;
      if (
        action.type === ActionType.CreateLink &&
        intent.task === IntentTask.TransferWalletToTreasury
      ) {
        feeType = FeeType.CREATE_LINK_FEE;
      }

      const label =
        intent.task === IntentTask.TransferWalletToTreasury
          ? "Create link fee"
          : "";
      const token = tokens[address];

      // compute adjusted amount (uses token fee when token found, otherwise ICP fallback)
      let asset: AssetItem;
      let fee: FeeItem | undefined;

      if (!token) {
        // Token not found: fallback to ICP
        console.error("Failed to resolve token for asset:", address);
        const { amount: forecastAmountRaw, fee: feeRaw } =
          this.computeAmountAndFee({
            intent,
            ledgerFee: ICP_LEDGER_FEE,
            actionType: action.type,
          });

        asset = {
          state: AssetProcessState.PENDING,
          label,
          symbol: "N/A",
          address,
          amount: parseBalanceUnits(forecastAmountRaw, 8).toString(),
          usdValueStr: undefined,
        };

        if (feeRaw === undefined) {
          fee = undefined;
        } else {
          fee = {
            feeType,
            amount: parseBalanceUnits(feeRaw, 8).toString(),
            symbol: "N/A",
          };
        }
      } else {
        const tokenFee = token.fee ?? ICP_LEDGER_FEE;
        const { amount: forecastAmountRaw, fee: feeRaw } =
          this.computeAmountAndFee({
            intent,
            ledgerFee: tokenFee,
            actionType: action.type,
          });

        const forecastFeeAmount = parseBalanceUnits(
          forecastAmountRaw,
          token.decimals,
        );
        const forecastFeeUsd = token.priceUSD
          ? forecastFeeAmount * token.priceUSD
          : undefined;

        asset = {
          state: AssetProcessState.PENDING,
          label,
          symbol: token.symbol,
          address,
          amount: formatNumber(forecastFeeAmount),
          usdValueStr: forecastFeeUsd
            ? formatNumber(forecastFeeUsd)
            : undefined,
        };

        if (feeRaw === undefined) {
          fee = undefined;
        } else {
          const tokenFeeAmount = parseBalanceUnits(feeRaw, token.decimals);
          const feeUsdValue = token.priceUSD
            ? tokenFeeAmount * token.priceUSD
            : undefined;
          const feeUsdValueStr = feeUsdValue
            ? formatNumber(feeUsdValue)
            : undefined;

          fee = {
            feeType,
            amount: formatNumber(tokenFeeAmount),
            symbol: token.symbol,
            price: token.priceUSD,
            usdValue: feeUsdValue,
            usdValueStr: feeUsdValueStr,
          };
        }
      }
      return { asset, fee };
    });

    return pairs;
  }
}
