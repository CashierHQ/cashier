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
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
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

import { FeeType, type FeeItem } from "$modules/links/types/fee";
import type { FeeBreakdownItem } from "$modules/links/utils/feesBreakdown";
import type {
  AssetAndFee,
  AssetAndFeeList,
  FeeConfig,
  WalletAssetInput,
} from "$modules/shared/types/feeService";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { TokenMetadataHelper } from "$modules/token/types/tokenMetadata";
import { TokenStandardMapper } from "$modules/token/types/tokenStandard";
import {
  calculateGateFeeAmount,
  calculateIntentFees,
  getGateCreateFeeAmount,
  getGateOpenFeeAmount,
  getLinkCreationFeeAmount,
  AddressType as SharedAddressType,
  IntentParticipants,
  IntentType as SharedIntentType,
  type Intent as SharedIntent,
} from "$shared";

export class FeeService {
  /**
   * Determines whether an intent payload is outgoing or incoming for the current wallet.
   *
   * @param payload Intent payload containing source and destination wallet addresses.
   * @param currentWalletPrincipal Principal text of the current user's wallet.
   * @returns The flow direction from the current wallet's perspective.
   * @throws Error when the current wallet is neither the source nor destination address.
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
   * Determines flow direction from a shared intent's intent type.
   *
   * Shared Send intents are treated as outgoing and shared Receive intents are
   * treated as incoming.
   *
   * @param intent Shared intent returned by the shared package or backend mapper.
   * @returns The flow direction represented by the shared intent.
   * @throws Error when the intent type is not Send or Receive.
   */
  getFlowDirectionFromSharedIntent(intent: SharedIntent): FlowDirectionValue {
    if (intent.intent_type === SharedIntentType.Send) {
      return FlowDirection.OUTGOING;
    } else if (intent.intent_type === SharedIntentType.Receive) {
      return FlowDirection.INCOMING;
    }
    throw new Error("User is neither sender nor receiver");
  }

  /**
   * Builds transaction-cart asset and fee rows from a link action.
   *
   * Each action intent is converted into an `AssetAndFee` pair with direction,
   * process state, token metadata, network fees, create-link fees, and gate fees.
   *
   * @param action Link action containing intents to display.
   * @param maxUse Maximum number of times the link can be used.
   * @param tokens Token metadata lookup keyed by token canister address.
   * @param currentWalletPrincipal Principal text of the current user's wallet.
   * @returns Asset and fee rows for transaction-cart rendering.
   * @throws Error when any intent references a token missing from `tokens`.
   */
  buildFromAction(
    action: Action,
    maxUse: number,
    tokens: Record<string, TokenWithPriceAndBalance>,
    currentWalletPrincipal: string,
  ): AssetAndFeeList {
    const pairs: AssetAndFee[] = [];
    const feeConfig = this.getLinkCreationFee();
    const feeTokenAddress = feeConfig.tokenAddress?.toLowerCase() ?? "";

    const hasFeeTokenOutgoingAssetIntent =
      action.type === ActionType.CREATE_LINK &&
      feeTokenAddress !== "" &&
      action.intents.some((intent) => {
        const address = intent.type.payload.asset.address.toString();
        return (
          address.toLowerCase() === feeTokenAddress &&
          intent.task === IntentTask.TRANSFER_WALLET_TO_LINK
        );
      });

    for (const intent of action.intents) {
      const address = intent.type.payload.asset.address.toString();
      const token = tokens[address];

      if (!token) {
        throw new Error(`Token not found for address ${address}`);
      }

      const direction = this.getFlowDirection(
        intent.type.payload,
        currentWalletPrincipal,
      );

      let feeType = FeeType.NETWORK_FEE;
      const isGateFeeIntent =
        action.type === ActionType.CREATE_LINK &&
        intent.destAddressType === SharedAddressType.Gate;
      if (
        action.type === ActionType.CREATE_LINK &&
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
      ) {
        feeType = isGateFeeIntent ? FeeType.GATE_FEE : FeeType.CREATE_LINK_FEE;
      }
      const label =
        intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
          ? isGateFeeIntent
            ? "Gate fee"
            : "Create link fee"
          : "";

      const ledgerFee = token?.fee ?? ICP_LEDGER_FEE;

      let intentParticipants: IntentParticipants =
        IntentParticipants.CreatorToLink;
      switch (intent.task) {
        case IntentTask.TRANSFER_WALLET_TO_TREASURY:
          intentParticipants = isGateFeeIntent
            ? IntentParticipants.CreatorToGate
            : IntentParticipants.CreatorToTreasury;
          break;
        case IntentTask.TRANSFER_WALLET_TO_LINK:
          intentParticipants = IntentParticipants.CreatorToLink;
          break;
        case IntentTask.TRANSFER_LINK_TO_WALLET:
          if (action.type === ActionType.RECEIVE) {
            intentParticipants = IntentParticipants.LinkToUser;
          } else if (action.type === ActionType.WITHDRAW) {
            intentParticipants = IntentParticipants.LinkToCreator;
          }
          break;
      }

      const intentFees = calculateIntentFees({
        intent_participants: intentParticipants,
        token_standard: TokenStandardMapper.toSharedType(
          TokenMetadataHelper.getTokenStandard(token),
        ),
        user_input_amount: intent.type.payload.amount,
        asset_network_fee: ledgerFee,
        link_creation_fee: isGateFeeIntent
          ? 0n
          : intent.type.payload.amount || feeConfig.amount,
        gate_count: isGateFeeIntent ? 1 : 0,
        gate_create_fee: isGateFeeIntent ? intent.type.payload.amount : 0n,
        gate_open_fee: 0n,
        link_max_asset_amount: intent.type.payload.amount,
        max_use: maxUse,
      });

      const decimals = token?.decimals ?? 8;
      const symbol = token?.symbol ?? "N/A";
      let assetAmount = isGateFeeIntent
        ? BigInt(intentFees.intent_total_amount)
        : direction === FlowDirection.OUTGOING
          ? BigInt(intentFees.intent_total_amount) +
            BigInt(intentFees.intent_total_network_fee)
          : BigInt(intentFees.intent_total_amount);

      // Effective total without double-counting: when the fee token (ICP) is also
      // an outgoing asset for link funding, one ledger fee overlaps between the
      // funding network fees and the link creation fee intent.
      if (
        feeType === FeeType.CREATE_LINK_FEE &&
        address.toLowerCase() === feeTokenAddress &&
        hasFeeTokenOutgoingAssetIntent
      ) {
        assetAmount = assetAmount > ledgerFee ? assetAmount - ledgerFee : 0n;
      }

      const amountUi = parseBalanceUnits(assetAmount, decimals);
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
        amount: assetAmount,
        amountFormattedStr: token
          ? formatNumber(amountUi)
          : amountUi.toString(),
        usdValueStr: amountUsd ? formatUsdAmount(amountUsd) : undefined,
        icon: token.runeInfo?.icon,
        direction,
        intentId: intent.id,
      };

      const feeAmount = isGateFeeIntent
        ? BigInt(intentFees.intent_total_amount)
        : BigInt(intentFees.intent_user_fee);
      const feeUi = parseBalanceUnits(feeAmount, decimals);
      const feeUsd = token?.priceUSD ? feeUi * token.priceUSD : undefined;
      const fee: FeeItem = {
        feeType,
        amount: feeAmount,
        amountFormattedStr: token ? formatNumber(feeUi) : feeUi.toString(),
        symbol,
        price: token?.priceUSD,
        usdValue: feeUsd,
        usdValueStr: feeUsd ? formatUsdAmount(feeUsd) : undefined,
      };

      pairs.push({ asset, fee });
    }
    return pairs;
  }

  /**
   * Builds transaction-cart asset and fee rows for a direct wallet transfer.
   *
   * The returned row includes the transfer amount plus ledger fee as the asset
   * amount and the ledger fee as a network fee.
   *
   * @param input Wallet transfer amount and token address.
   * @param tokens Token metadata lookup keyed by token canister address.
   * @returns A single outgoing wallet transfer row, or an empty list when the token cannot be resolved.
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
          amountFormattedStr: formatNumber(totalUi, {
            tofixed: token.decimals,
          }),
          usdValueStr: token.priceUSD
            ? formatUsdAmount(totalUi * token.priceUSD)
            : undefined,
          icon: token.runeInfo?.icon,
          direction: FlowDirection.OUTGOING,
        },
        fee: {
          feeType: FeeType.NETWORK_FEE,
          amount: fee,
          amountFormattedStr: formatNumber(feeUi, {
            tofixed: token.decimals,
          }),
          symbol: token.symbol,
          usdValue: token.priceUSD ? feeUi * token.priceUSD : undefined,
        },
      },
    ];
  }

  /**
   * Converts asset and fee rows into fee breakdown drawer items.
   *
   * Rows without fees or token metadata are skipped. Create-link and gate fees
   * use the asset amount as the displayed fee amount; network fees use the fee
   * amount directly.
   *
   * @param assetAndFeeList Asset and fee rows produced by this service.
   * @param tokens Token metadata list used to format fee breakdown rows.
   * @returns Fee breakdown items suitable for the fee info drawer.
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

      const isCreateLinkFee = item.fee.feeType === FeeType.CREATE_LINK_FEE;
      const isGateFee = item.fee.feeType === FeeType.GATE_FEE;

      const amount =
        isCreateLinkFee || isGateFee ? item.asset.amount : item.fee.amount;
      const usdAmount =
        isCreateLinkFee || isGateFee
          ? parseFloat(item.asset.usdValueStr ?? "0")
          : item.fee.usdValue;

      breakdown.push({
        name: isCreateLinkFee
          ? "Link creation fee"
          : isGateFee
            ? "Gate fee"
            : "Network fee",
        amount,
        tokenAddress: item.asset.address,
        tokenSymbol: token.symbol,
        tokenDecimals: token.decimals,
        usdAmount: usdAmount ?? 0,
      });
    }

    return breakdown;
  }

  /**
   * Returns the configured link creation fee metadata.
   *
   * @returns Link creation fee amount, token address, symbol, and decimals.
   */
  getLinkCreationFee(): FeeConfig {
    return {
      amount: getLinkCreationFeeAmount(),
      tokenAddress: ICP_LEDGER_CANISTER_ID,
      symbol: "ICP",
      decimals: 8,
    };
  }

  /**
   * Returns the configured gate fee metadata for a link.
   *
   * The amount is calculated by the shared fee calculator from gate count and
   * link max-use count.
   *
   * @param gateCount Number of gates configured on the link.
   * @param maxUse Maximum number of times the link can be used.
   * @returns Gate fee amount, token address, symbol, and decimals.
   */
  getGateFee(gateCount: number, maxUse: number): FeeConfig {
    const gateCountNum = gateCount || 0;
    const maxUseNum = maxUse || 1;

    return {
      amount: calculateGateFeeAmount(
        gateCountNum,
        maxUseNum,
        getGateCreateFeeAmount(),
        getGateOpenFeeAmount(),
      ),
      tokenAddress: ICP_LEDGER_CANISTER_ID,
      symbol: "ICP",
      decimals: 8,
    };
  }
}

export const feeService = new FeeService();
