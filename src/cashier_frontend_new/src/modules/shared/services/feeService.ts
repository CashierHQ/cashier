import Action from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import IntentTask from "$modules/links/types/action/intentTask";
import type { IntentStateValue } from "$modules/links/types/action/intentState";
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
  type FeeItem,
} from "$modules/links/types/fee";
import {
  AccessProcessStateMapper,
  AssetProcessState,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import type { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
import { shortenAddress } from "$modules/wallet/utils/address";
import type {
  AssetAndFeeList,
  ForecastAssetAndFee,
  SendFeeOutput,
} from "$modules/shared/types/feeService";

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
   */
  mapActionToAssetAndFeeList(
    action: Action,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): AssetAndFeeList {
    return action.intents.map((intent) => {
      const address = intent.type.payload.asset.address.toString();
      const isCreateLinkTreasury =
        action.type === ActionType.CREATE_LINK &&
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY;
      const feeType = isCreateLinkTreasury
        ? FeeType.CREATE_LINK_FEE
        : FeeType.NETWORK_FEE;
      const label = isCreateLinkTreasury ? "Create link fee" : "";
      const token = tokens[address];

      if (!token) {
        console.error("Failed to resolve token for asset:", address);
        const { amount: forecastAmountRaw, fee: feeRaw } =
          this.computeAmountAndFee({
            intent,
            ledgerFee: ICP_LEDGER_FEE,
            actionType: action.type,
          });

        return {
          asset: {
            state: AssetProcessState.PENDING,
            label,
            symbol: "N/A",
            address,
            amount: forecastAmountRaw,
            amountFormattedStr: parseBalanceUnits(
              forecastAmountRaw,
              8,
            ).toString(),
            usdValueStr: undefined,
          },
          fee: feeRaw
            ? {
                feeType,
                amount: feeRaw,
                amountFormattedStr: parseBalanceUnits(feeRaw, 8).toString(),
                symbol: "N/A",
              }
            : undefined,
        };
      }

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

      const asset: AssetItem = {
        state: AccessProcessStateMapper.fromIntentState(
          intent.state as IntentStateValue,
        ),
        label,
        symbol: token.symbol,
        address,
        amount: forecastAmountRaw,
        amountFormattedStr: formatNumber(forecastFeeAmount),
        usdValueStr: forecastFeeUsd
          ? formatUsdAmount(forecastFeeUsd)
          : undefined,
      };

      let fee: FeeItem | undefined;
      if (feeRaw !== undefined) {
        const tokenFeeAmount = parseBalanceUnits(feeRaw, token.decimals);
        const feeUsdValue = token.priceUSD
          ? tokenFeeAmount * token.priceUSD
          : undefined;

        fee = {
          feeType,
          amount: feeRaw,
          amountFormattedStr: formatNumber(tokenFeeAmount),
          symbol: token.symbol,
          price: token.priceUSD,
          usdValue: feeUsdValue,
          usdValueStr: feeUsdValue ? formatUsdAmount(feeUsdValue) : undefined,
        };
      }

      return { asset, fee };
    });
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
   * Compute send fee for wallet transfers
   */
  computeSendFee(
    sendAmount: bigint,
    token: TokenWithPriceAndBalance,
    receiveAddress: string,
  ): SendFeeOutput {
    const fee = token.fee ?? ICP_LEDGER_FEE;
    const totalAmount = sendAmount + fee;
    const { decimals, priceUSD } = token;

    const sendAmountUi = parseBalanceUnits(sendAmount, decimals);
    const feeUi = parseBalanceUnits(fee, decimals);
    const totalAmountUi = parseBalanceUnits(totalAmount, decimals);

    const sendAmountUsd = priceUSD ? sendAmountUi * priceUSD : undefined;
    const feeUsd = priceUSD ? feeUi * priceUSD : undefined;
    const totalAmountUsd = priceUSD ? totalAmountUi * priceUSD : undefined;

    return {
      sendAmount,
      fee,
      totalAmount,
      symbol: token.symbol,
      decimals,
      tokenAddress: token.address,
      tokenLogo: getTokenLogo(token.address),
      receiveAddress,
      receiveAddressShortened: shortenAddress(receiveAddress),
      networkName: "Internet Computer",
      networkLogo: "/icpLogo.png",
      sendAmountFormatted: formatNumber(sendAmountUi, { tofixed: decimals }),
      feeFormatted: formatNumber(feeUi, { tofixed: decimals }),
      totalAmountFormatted: formatNumber(totalAmountUi, { tofixed: decimals }),
      sendAmountUsd,
      feeUsd,
      totalAmountUsd,
      sendAmountUsdFormatted: sendAmountUsd
        ? formatUsdAmount(sendAmountUsd)
        : undefined,
      feeUsdFormatted: feeUsd ? formatUsdAmount(feeUsd) : undefined,
      totalAmountUsdFormatted: totalAmountUsd
        ? formatUsdAmount(totalAmountUsd)
        : undefined,
    };
  }

  /**
   * Forecast asset and fee list for link creation preview (before Action exists)
   */
  forecastLinkCreationFees(
    linkAssets: Array<CreateLinkAsset>,
    maxUse: number,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): ForecastAssetAndFee[] {
    const pairs: ForecastAssetAndFee[] = linkAssets.map((assetData) => {
      const token = tokens[assetData.address];

      if (!token) {
        console.error("Failed to resolve token for asset:", assetData.address);
        const totalAmount = assetData.useAmount + ICP_LEDGER_FEE;
        return {
          asset: {
            label: "",
            symbol: "N/A",
            address: assetData.address,
            amount: parseBalanceUnits(totalAmount, 8).toString(),
            usdValueStr: undefined,
          },
          fee: {
            amount: ICP_LEDGER_FEE,
            feeType: FeeType.NETWORK_FEE,
            amountFormattedStr: parseBalanceUnits(ICP_LEDGER_FEE, 8).toString(),
            symbol: "N/A",
          },
        };
      }

      const tokenFee = token.fee ?? ICP_LEDGER_FEE;
      const totalAmount =
        assetData.useAmount + BigInt(maxUse) * tokenFee + tokenFee;
      const totalAmountUi = parseBalanceUnits(totalAmount, token.decimals);
      const feeAmountUi = parseBalanceUnits(tokenFee, token.decimals);
      const totalUsd = token.priceUSD
        ? totalAmountUi * token.priceUSD
        : undefined;
      const feeUsd = token.priceUSD ? feeAmountUi * token.priceUSD : undefined;

      return {
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
      };
    });

    // Add link creation fee item
    const linkFeeInfo = this.getLinkCreationFee();
    const linkFeeToken = tokens[linkFeeInfo.tokenAddress];
    if (linkFeeToken) {
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
}

export const feeService = new FeeService();
