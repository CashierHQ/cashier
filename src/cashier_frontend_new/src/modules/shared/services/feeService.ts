import { ActionType } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
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
} from "$modules/links/types/fee";
import type { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import type { AssetAndFeeList, ForecastAssetAndFee } from "../types/feeService";

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
   *    - amount = payload.amount
   *    - fee = ledgerFee
   * 4) Receive:
   *    - amount = payload.amount
   *    - fee = undefined
   * 5) Send:
   *    - amount = payload.amount + ledgerFee
   *    - fee = ledgerFee
   */
  computeActionAmountAndFee({
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
        // Fallback to ICP values: (useAmount + ledgerFee) * maxUse + ledgerFee
        const totalAmount =
          (assetData.useAmount + ICP_LEDGER_FEE) * BigInt(maxUse) +
          ICP_LEDGER_FEE;
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
            amount: ICP_LEDGER_FEE,
            feeType: FeeType.NETWORK_FEE,
            amountFormattedStr: parseBalanceUnits(ICP_LEDGER_FEE, 8).toString(),
            symbol: "N/A",
          },
        });
      } else {
        const tokenFee = token.fee ?? ICP_LEDGER_FEE;
        // For CREATE_LINK preview: amount =(payload.amount + ledgerFee) * maxUse + ledgerFee
        const totalAmount =
          (assetData.useAmount + tokenFee) * BigInt(maxUse) + tokenFee;
        const totalAmountUi = parseBalanceUnits(totalAmount, token.decimals);
        const totalUsd = token.priceUSD
          ? totalAmountUi * token.priceUSD
          : undefined;
        const feeAmountUi = parseBalanceUnits(tokenFee, token.decimals);
        const feeUsd = token.priceUSD
          ? feeAmountUi * token.priceUSD
          : undefined;

        pairs.push({
          asset: {
            label: "",
            symbol: token.symbol,
            address: assetData.address,
            amount: formatNumber(totalAmountUi),
            usdValueStr: totalUsd ? formatUsdAmount(totalUsd) : undefined,
          },
          fee: {
            amount: tokenFee,
            feeType: FeeType.NETWORK_FEE,
            amountFormattedStr: formatNumber(feeAmountUi),
            symbol: token.symbol,
            price: token.priceUSD,
            usdValue: feeUsd,
            usdValueStr: feeUsd ? formatUsdAmount(feeUsd) : undefined,
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
          usdValueStr: linkFeeUsd ? formatUsdAmount(linkFeeUsd) : undefined,
        },
        fee: {
          amount: linkCreationFeeTotal,
          feeType: FeeType.CREATE_LINK_FEE,
          amountFormattedStr: formatNumber(linkFeeFormatted),
          symbol: linkFeeToken.symbol,
          price: linkFeeToken.priceUSD,
          usdValue: linkFeeUsd,
          usdValueStr: linkFeeUsd ? formatUsdAmount(linkFeeUsd) : undefined,
        },
      });
    }

    return pairs;
  }
  /**
   * Convert AssetAndFeeList to FeeBreakdownItem[] format for FeeInfoDrawer.
   * @param assetAndFeeList - List of AssetAndFee pairs
   * @param tokens - Map of token address to TokenWithPriceAndBalance
   * @returns FeeBreakdownItem[]
   */
  convertAssetAndFeeListToFeesBreakdown(
    assetAndFeeList: AssetAndFeeList,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): FeeBreakdownItem[] {
    const breakdown: FeeBreakdownItem[] = [];

    for (const item of assetAndFeeList) {
      if (!item.fee) continue;

      const token = tokens[item.asset.address];
      if (!token) continue;

      const feeName =
        item.fee.feeType === FeeType.CREATE_LINK_FEE
          ? "Link creation fee"
          : "Network fees";

      breakdown.push({
        name: feeName,
        amount: item.fee.amount,
        tokenAddress: item.asset.address,
        tokenSymbol: token.symbol,
        tokenDecimals: token.decimals,
        usdAmount: item.fee.usdValue || 0,
      });
    }

    return breakdown;
  }

  /**
   * Utility to derive FeeBreakdownItem[] from AssetAndFeeList using an array of tokens.
   * Encapsulates the map creation so UI components stay rendering-only.
   * @param assetAndFeeList - List of AssetAndFee pairs
   * @param tokens - Array of tokens for lookup
   * @returns FeeBreakdownItem[]
   */
  buildFeesBreakdownFromAssetAndFeeList(
    assetAndFeeList: AssetAndFeeList,
    tokens: TokenWithPriceAndBalance[],
  ): FeeBreakdownItem[] {
    const tokensMap = Object.fromEntries(tokens.map((t) => [t.address, t]));
    return this.convertAssetAndFeeListToFeesBreakdown(
      assetAndFeeList,
      tokensMap,
    );
  }

  /**
   * Calculate total fees in USD from AssetAndFee list.
   */
  getTotalFeeUsd(assets: AssetAndFeeList): number {
    return assets.reduce((total, item) => total + (item.fee?.usdValue ?? 0), 0);
  }

  /**
   * Compute wallet transfer fee for ICRC/ICP tokens.
   * Returns amount+fee and fee in raw bigint format.
   * @param amount - Transfer amount excluding fee
   * @param tokenFee - Optional token fee; defaults to ICP ledger fee if undefined
   * @returns ComputeAmountAndFeeOutput with total amount and fee
   */
  computeWalletFee(
    amount: bigint,
    tokenFee: bigint | undefined,
  ): ComputeAmountAndFeeOutput {
    const fee = tokenFee ?? ICP_LEDGER_FEE;
    return {
      amount: amount + fee,
      fee,
    };
  }
}

export const feeService = new FeeService();
