import Action from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import {
  ICP_LEDGER_FEE,
  ICP_LEDGER_CANISTER_ID,
} from "$modules/token/constants";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

import { assertUnreachable } from "$lib/rsMatch";
import {
  FeeType,
  type ComputeAmountAndFeeInput,
  type ComputeAmountAndFeeOutput,
  type FeeItem,
} from "$modules/links/types/fee";
import {
  AccessProcessStateMapper,
  AssetProcessState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import type { IntentStateValue } from "$modules/links/types/action/intentState";
import type { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";

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

export class FeeService {
  /**
   * Compute both the final amount (what will be shown as the asset amount)
   * and an optional fee (undefined when there is no fee to display) based
   * on the provided rules.
   * 1) CreateLink + TransferWalletToTreasury:
   *    - amount = ledgerFee*2 + payload.amount
   *    - fee = ledgerFee*2 + payload.amount
   * 2) CreateLink + other intent:
   *    - amount = ledgerFee + payload.amount
   *    - fee = ledgerFee
   * 3) Withdraw:
   *    - amount = payload.amount - ledgerFee
   *    - fee = ledgerFee
   * 4) Receive:
   *    - amount = payload.amount
   *    - fee = undefined
   * 5) Send:
   *    - amount = payload.amount + ledgerFee
   *    - fee = ledgerFee
   */
  computeAmountAndFee({
    intent,
    ledgerFee,
    actionType,
  }: ComputeAmountAndFeeInput): ComputeAmountAndFeeOutput {
    let output: ComputeAmountAndFeeOutput;
    switch (actionType) {
      case ActionType.CREATE_LINK:
        if (intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY) {
          const total = ledgerFee * 2n + intent.type.payload.amount;
          output = { amount: total, fee: total };
        } else {
          output = {
            amount: ledgerFee + intent.type.payload.amount,
            fee: ledgerFee,
          };
        }
        break;
      case ActionType.WITHDRAW:
        output = {
          amount: intent.type.payload.amount,
          fee: ledgerFee,
        };
        break;
      case ActionType.SEND:
        output = {
          amount: intent.type.payload.amount + ledgerFee,
          fee: ledgerFee,
        };
        break;
      case ActionType.RECEIVE:
        output = { amount: intent.type.payload.amount, fee: undefined };
        break;
      default:
        return assertUnreachable(actionType);
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
        action.type === ActionType.CREATE_LINK &&
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
      ) {
        feeType = FeeType.CREATE_LINK_FEE;
      }

      const label =
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
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
          state: AccessProcessStateMapper.fromIntentState(
            intent.state as IntentStateValue,
          ),
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

  /**
   * Get link creation fee information
   * @returns Object with fee amount, token address, symbol, and decimals
   */
  getLinkCreationFee() {
    return {
      amount: 10_000n, // 0.0001 ICP in e8s
      tokenAddress: ICP_LEDGER_CANISTER_ID,
      symbol: "ICP",
      decimals: 8,
    };
  }

  /**
   * Forecast asset and fee list for link creation preview (before Action exists)
   * @param linkAssets - Array of assets in the link
   * @param maxUse - Maximum uses of the link
   * @param tokens - Token lookup by address
   * @returns AssetAndFeeList formatted for display
   */
  forecastLinkCreationFees(
    linkAssets: Array<CreateLinkAsset>,
    maxUse: number,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): ForecastAssetAndFee[] {
    const pairs: ForecastAssetAndFee[] = [];

    for (const assetData of linkAssets) {
      const token = tokens[assetData.address];

      if (!token) {
        console.error("Failed to resolve token for asset:", assetData.address);
        // Fallback to ICP values
        const totalAmount = assetData.useAmount + ICP_LEDGER_FEE;
        const amountStr = parseBalanceUnits(totalAmount, 8).toString();

        pairs.push({
          asset: {
            label: "",
            symbol: "N/A",
            address: assetData.address,
            amount: amountStr,
            usdValueStr: undefined,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: parseBalanceUnits(ICP_LEDGER_FEE, 8).toString(),
            symbol: "N/A",
          },
        });
      } else {
        const tokenFee = token.fee ?? ICP_LEDGER_FEE;
        // For CREATE_LINK preview: amount = payload.amount + (ledgerFee * maxUse) + ledgerFee
        const totalAmount =
          assetData.useAmount + BigInt(maxUse) * tokenFee + tokenFee;
        const totalAmountUi = parseBalanceUnits(totalAmount, token.decimals);
        const totalUsd = token.priceUSD
          ? totalAmountUi * token.priceUSD
          : undefined;
        const feeAmountUi = parseBalanceUnits(tokenFee, token.decimals);
        const feeUsd = token.priceUSD
          ? feeAmountUi * token.priceUSD
          : undefined;

        console.log(
          "totalAmount",
          totalAmount.toString(),
          "ui:",
          totalAmountUi,
        );

        pairs.push({
          asset: {
            label: "",
            symbol: token.symbol,
            address: assetData.address,
            amount: formatNumber(totalAmountUi),
            usdValueStr: totalUsd ? formatNumber(totalUsd) : undefined,
          },
          fee: {
            feeType: FeeType.NETWORK_FEE,
            amount: formatNumber(feeAmountUi),
            symbol: token.symbol,
            price: token.priceUSD,
            usdValue: feeUsd,
            usdValueStr: feeUsd ? formatNumber(feeUsd) : undefined,
          },
        });
      }
    }

    // Add link creation fee item (use ICP fee token)
    const linkFeeInfo = this.getLinkCreationFee();
    const linkFeeToken = tokens[linkFeeInfo.tokenAddress];
    if (linkFeeToken) {
      // For CREATE_LINK preview: amount = ledgerFee*2 + linkFeeInfo.amount
      const linkCreationFeeTotal = ICP_LEDGER_FEE * 2n + linkFeeInfo.amount;
      const linkFeeFormatted = parseBalanceUnits(
        linkCreationFeeTotal,
        linkFeeToken.decimals,
      );
      const linkFeeUsd = linkFeeToken.priceUSD
        ? linkFeeFormatted * linkFeeToken.priceUSD
        : undefined;

      pairs.push({
        asset: {
          label: "Create link fee",
          symbol: linkFeeToken.symbol,
          address: linkFeeInfo.tokenAddress,
          amount: formatNumber(linkFeeFormatted),
          usdValueStr: linkFeeUsd ? formatNumber(linkFeeUsd) : undefined,
        },
        fee: {
          feeType: FeeType.CREATE_LINK_FEE,
          amount: formatNumber(linkFeeFormatted),
          symbol: linkFeeToken.symbol,
          price: linkFeeToken.priceUSD,
          usdValue: linkFeeUsd,
          usdValueStr: linkFeeUsd ? formatNumber(linkFeeUsd) : undefined,
        },
      });
    }

    return pairs;
  }
}

export const feeService = new FeeService();
