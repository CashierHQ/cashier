import type Action from "$modules/links/types/action/action";
import { ICP_LEDGER_FEE } from "$modules/token/constants";
import { ActionType } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import {
  type AssetItem,
  AssetProcessState,
} from "$modules/links/components/txCart/type";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import { FeeType, type FeeItem } from "../type";
import type Intent from "$modules/links/types/action/intent";
import { assertUnreachable } from "$lib/rsMatch";

// Type for paired AssetItem and FeeItem
type AssetAndFeeList = {
  asset: AssetItem;
  fee?: FeeItem;
}[];

export class FeeService {
  /**
   * Forecast the final fee amount for a given intent and action type.
   * @param intent The intent to calculate the fee for.
   * @param ledgerFee The base ledger fee to consider.
   * @param actionType The type of action being performed.
   * @returns The forecasted fee amount as bigint.
   * */
  forecastFee({
    intent,
    ledgerFee,
    actionType,
  }: {
    intent: Intent;
    ledgerFee: bigint;
    actionType: ActionType;
  }): bigint {
    const { amount } = this.computeAmountAndFeeRaw({
      intent,
      ledgerFee,
      actionType,
    });
    return amount;
  }

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
   * 4) Receive: amount = payload.amount
   *    fee = undefined
   */
  computeAmountAndFeeRaw({
    intent,
    ledgerFee,
    actionType,
  }: {
    intent: Intent;
    ledgerFee: bigint;
    actionType: ActionType;
  }): { amount: bigint; fee?: bigint } {
    if (actionType === ActionType.CreateLink) {
      if (intent.task === IntentTask.TransferWalletToTreasury) {
        const total = ledgerFee * 2n + intent.type.payload.amount;
        return { amount: total, fee: total };
      } else {
        return {
          amount: ledgerFee + intent.type.payload.amount,
          fee: ledgerFee,
        };
      }
    } else if (actionType === ActionType.Withdraw) {
      return { amount: intent.type.payload.amount - ledgerFee, fee: ledgerFee };
    } else if (actionType === ActionType.Send) {
      return { amount: intent.type.payload.amount + ledgerFee, fee: ledgerFee };
    } else if (actionType === ActionType.Receive) {
      return { amount: intent.type.payload.amount, fee: undefined };
    }

    assertUnreachable(actionType as never);
  }

  /**
   * Map an Action to a list of paired AssetItem and FeeItem for each intent.
   * @param action
   * @returns Array of Asset and Fee pairs
   */
  mapActionToAssetAndFeeList(action: Action): AssetAndFeeList {
    const pairs: AssetAndFeeList = action.intents.map((intent) => {
      const address = intent.type.payload.asset.address.toString();

      // --- Asset mapping (inlined from mapActionToAssetItems) ---
      const getLabel = (it: Intent) =>
        it.task === IntentTask.TransferWalletToTreasury
          ? "Create link fee"
          : "";

      // Determine fee type
      let feeType = FeeType.NETWORK_FEE;
      if (
        action.type === ActionType.CreateLink &&
        intent.task === IntentTask.TransferWalletToTreasury
      ) {
        feeType = FeeType.CREATE_LINK_FEE;
      }

      const label = getLabel(intent);
      const tokenRes = walletStore.findTokenByAddress(address);
      const id = intent.id + "_" + address;

      // compute adjusted amount (uses token fee when token found, otherwise ICP fallback)
      let asset: AssetItem;
      let fee: FeeItem | undefined;

      if (tokenRes.isErr()) {
        // Token not found: fallback to ICP
        console.error(
          "Failed to resolve token for asset:",
          address,
          tokenRes.unwrapErr(),
        );
        const { amount: forecastAmountRaw, fee: feeRaw } =
          this.computeAmountAndFeeRaw({
            intent,
            ledgerFee: ICP_LEDGER_FEE,
            actionType: action.type,
          });

        asset = {
          id,
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
        const token = tokenRes.unwrap();
        const tokenFee = token.fee ?? ICP_LEDGER_FEE;
        const { amount: forecastAmountRaw, fee: feeRaw } =
          this.computeAmountAndFeeRaw({
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
          id,
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
