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
  fee: FeeItem;
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
    if (actionType === ActionType.CreateLink) {
      if (intent.task === IntentTask.TransferWalletToTreasury) {
        return ledgerFee * 2n + intent.type.payload.amount;
      } else {
        return ledgerFee + intent.type.payload.amount;
      }
    } else if (
      actionType === ActionType.Withdraw ||
      actionType === ActionType.Receive
    ) {
      return intent.type.payload.amount - ledgerFee;
    } else if (actionType === ActionType.Send) {
      return intent.type.payload.amount + ledgerFee;
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
      let fee: FeeItem;

      if (tokenRes.isErr()) {
        // Token not found: fallback to ICP
        console.error(
          "Failed to resolve token for asset:",
          address,
          tokenRes.unwrapErr(),
        );

        const forecastFeeRaw = this.forecastFee({
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
          amount: parseBalanceUnits(forecastFeeRaw, 8).toString(),
          usdValueStr: undefined,
        };
        fee = {
          feeType,
          amount: parseBalanceUnits(ICP_LEDGER_FEE, 8).toString(),
          symbol: "N/A",
        };
      } else {
        const token = tokenRes.unwrap();
        const tokenFee = token.fee ?? ICP_LEDGER_FEE;

        const forecastFeeRaw = this.forecastFee({
          intent,
          ledgerFee: tokenFee,
          actionType: action.type,
        });
        const forecastFeeAmount = parseBalanceUnits(
          forecastFeeRaw,
          token.decimals,
        );
        const forecastFeeUsd = token.priceUSD
          ? forecastFeeAmount * token.priceUSD
          : undefined;

        let tokenFeeAmount: number;
        if (feeType == FeeType.CREATE_LINK_FEE) {
            tokenFeeAmount = parseBalanceUnits(token.fee * 3n, token.decimals);
        }
        else {
           tokenFeeAmount = parseBalanceUnits(tokenFee, token.decimals);
        }
       
        const feeUsdValue = token.priceUSD
          ? tokenFeeAmount * token.priceUSD
          : undefined;
        const feeUsdValueStr =
          feeUsdValue ? formatNumber(feeUsdValue) : undefined;

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

        fee = {
          feeType,
          amount: formatNumber(tokenFeeAmount),
          symbol: token.symbol,
          price: token.priceUSD,
          usdValue: feeUsdValue,
          usdValueStr: feeUsdValueStr,
        };
      }
      return { asset, fee };
    });

    return pairs;
  }
}
