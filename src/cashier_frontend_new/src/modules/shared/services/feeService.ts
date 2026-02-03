import type Action from "$modules/links/types/action/action";
import { ActionType } from "$modules/links/types/action/actionType";
import type { IntentStateValue } from "$modules/links/types/action/intentState";
import IntentTask from "$modules/links/types/action/intentTask";
import type { IntentPayload } from "$modules/links/types/action/intentType";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import {
  ICP_LEDGER_FEE,
  ICP_LEDGER_CANISTER_ID,
} from "$modules/token/constants";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import {
  FlowDirection,
  type FlowDirectionValue,
} from "$modules/transactionCart/types/transactionSource";
import {
  AssetProcessState,
  AssetProcessStateMapper,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";

import { assertUnreachable } from "$lib/rsMatch";
import {
  FeeType,
  type ComputeAmountAndFeeInput,
  type ComputeAmountAndFeeOutput,
  type FeeItem,
} from "$modules/links/types/fee";
import type { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import type {
  AssetAndFeeList,
  ForecastAssetAndFee,
  WalletAssetInput,
} from "../types/feeService";
import {
  calculateIntentFees,
  IntentParticipants,
  TokenStandard,
  type IntentParticipants as IntentParticipantsType,
  type TokenStandard as TokenStandardType,
} from "$shared";

export class FeeService {
  /**
   * Map ActionType and IntentTask to IntentParticipants from shared package.
   * @param actionType ActionType
   * @param intentTask IntentTask
   * @returns IntentParticipantsType
   */
  private mapToIntentParticipants(
    actionType: string,
    intentTask: string,
  ): IntentParticipantsType {
    switch (actionType) {
      case ActionType.CREATE_LINK:
        if (intentTask === IntentTask.TRANSFER_WALLET_TO_TREASURY) {
          return IntentParticipants.CreatorToTreasury;
        }
        return IntentParticipants.CreatorToLink;
      case ActionType.SEND:
        return IntentParticipants.UserToLink;
      case ActionType.RECEIVE:
        return IntentParticipants.LinkToUser;
      case ActionType.WITHDRAW:
        return IntentParticipants.LinkToCreator;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Get token standard for a token.
   * Currently defaults to ICRC1 for all tokens.
   * TODO: Add proper ICRC1/ICRC2 detection when backend provides this info.
   * @param _token TokenWithPriceAndBalance
   * @returns TokenStandardType
   */
  private getTokenStandard(_token?: TokenWithPriceAndBalance): TokenStandardType {
    // For now, default to ICRC1
    // In the future, we can check token metadata or backend info
    return TokenStandard.ICRC1;
  }

  /**
   * Compute flow direction from intent payload.
   * @param payload IntentPayload
   * @param currentWalletPrincipal Principal of the current user's wallet
   * @return FlowDirectionValue
   * @throws Error if user is neither sender nor receiver
   */
  getFlowDirection(
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
   * Rules (maintaining backward compatibility with existing behavior):
   * 1) CreateLink + TransferWalletToTreasury: amount=fee=ledgerFee*2+payload.amount
   * 2) CreateLink + other: amount=ledgerFee+payload.amount, fee=ledgerFee
   * 3) Withdraw: amount=payload.amount, fee=ledgerFee
   * 4) Receive: amount=payload.amount, fee=undefined
   * 5) Send: amount=payload.amount+ledgerFee, fee=ledgerFee
   * 
   * Note: Uses shared package fee calculations for consistent fee display across all components.
   */
  computeAmount({
    intent,
    ledgerFee,
    actionType,
  }: ComputeAmountAndFeeInput): ComputeAmountAndFeeOutput {
    let output: ComputeAmountAndFeeOutput;
    switch (actionType) {
      case ActionType.CREATE_LINK:
        if (intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY) {
          // Use shared package for CreatorToTreasury
          const result = calculateIntentFees({
            intent_participants: IntentParticipants.CreatorToTreasury,
            token_standard: TokenStandard.ICRC1,
            link_creation_fee: intent.type.payload.amount,
            asset_network_fee: ledgerFee,
          });
          const userFee = BigInt(result.intent_user_fee);
          output = { amount: userFee, fee: userFee };
        } else {
          // For TRANSFER_WALLET_TO_LINK: Backend sends total amount (asset + fees) × maxUse
          // Display the backend's amount as-is, but show fees separately for breakdown
          // We don't know maxUse here, so we estimate: backend sends (amount_per_use + fee) × maxUse
          // Since we don't have the original amount_per_use, we show the ledgerFee as a minimum estimate
          output = {
            amount: intent.type.payload.amount,
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
   * Build AssetAndFeeList from Action.
   * @param action Action containing intents
   * @param tokens Map of token address to TokenWithPriceAndBalance
   * @param currentWalletPrincipal Principal of the current user's wallet
   */
  buildFromAction(
    action: Action,
    tokens: Record<string, TokenWithPriceAndBalance>,
    currentWalletPrincipal: string,
  ): AssetAndFeeList {
    return action.intents.map((intent) => {
      const address = intent.type.payload.asset.address.toString();
      const token = tokens[address];
      const direction = this.getFlowDirection(
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
      const { amount: forecastAmount, fee: feeRaw } = this.computeAmount({
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
   * Build AssetAndFeeList from wallet transfer input.
   * @param input WalletAssetInput
   * @param tokens Map of token address to TokenWithPriceAndBalance
   */
  buildFromWallet(
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

  /**
   * Convert AssetAndFeeList to FeeBreakdownItem[] for FeeInfoDrawer.
   * @param assetAndFeeList List of AssetAndFee pairs
   * @param tokens Array of tokens for lookup
   */
  buildBreakdown(
    assetAndFeeList: AssetAndFeeList,
    tokens: TokenWithPriceAndBalance[],
  ): FeeBreakdownItem[] {
    const tokensMap = Object.fromEntries(tokens.map((t) => [t.address, t]));
    const breakdown: FeeBreakdownItem[] = [];

    for (const item of assetAndFeeList) {
      if (!item.fee) continue;
      const token = tokensMap[item.asset.address];
      if (!token) continue;

      breakdown.push({
        name:
          item.fee.feeType === FeeType.CREATE_LINK_FEE
            ? "Link creation fee"
            : "Network fees",
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
   * Get link creation fee information.
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
   * Forecast asset and fee list for link creation preview (before Action exists).
   * Uses shared package fee calculation functions.
   * @param linkAssets Array of assets in the link
   * @param maxUse Maximum uses of the link
   * @param tokens Token lookup by address
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
        // Fallback calculation when token not found
        const feeResult = calculateIntentFees({
          intent_participants: IntentParticipants.CreatorToLink,
          token_standard: TokenStandard.ICRC1,
          user_input_amount: assetData.useAmount,
          max_use: maxUse,
          asset_network_fee: ICP_LEDGER_FEE,
        });
        
        const totalAmount = BigInt(feeResult.intent_user_fee) + assetData.useAmount * BigInt(maxUse);
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
            amount: BigInt(feeResult.intent_total_network_fee),
            feeType: FeeType.NETWORK_FEE,
            amountFormattedStr: parseBalanceUnits(BigInt(feeResult.intent_total_network_fee), 8).toString(),
            symbol: "N/A",
          },
        });
      } else {
        const tokenFee = token.fee ?? ICP_LEDGER_FEE;
        const tokenStandard = this.getTokenStandard(token);
        
        // Calculate using shared package
        const feeResult = calculateIntentFees({
          intent_participants: IntentParticipants.CreatorToLink,
          token_standard: tokenStandard,
          user_input_amount: assetData.useAmount,
          max_use: maxUse,
          asset_network_fee: tokenFee,
        });
        
        const networkFee = BigInt(feeResult.intent_total_network_fee);
        const totalAmount = assetData.useAmount * BigInt(maxUse) + networkFee;
        const totalAmountUi = parseBalanceUnits(totalAmount, token.decimals);
        const totalUsd = token.priceUSD
          ? totalAmountUi * token.priceUSD
          : undefined;
        const feeAmountUi = parseBalanceUnits(networkFee, token.decimals);
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
            amount: networkFee,
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

    // Add link creation fee item using shared package
    const linkFeeInfo = this.getLinkCreationFee();
    const linkFeeToken = tokens[linkFeeInfo.tokenAddress];
    if (linkFeeToken) {
      const linkCreationResult = calculateIntentFees({
        intent_participants: IntentParticipants.CreatorToTreasury,
        token_standard: TokenStandard.ICRC1, // ICP is ICRC1
        link_creation_fee: linkFeeInfo.amount,
        asset_network_fee: ICP_LEDGER_FEE,
      });
      
      const linkCreationFeeTotal = BigInt(linkCreationResult.intent_user_fee);
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
}

export const feeService = new FeeService();
