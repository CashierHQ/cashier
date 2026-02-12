import type Action from "$modules/links/types/action/action";
import IntentTask from "$modules/links/types/action/intentTask";
import type { IntentStateValue } from "$modules/links/types/action/intentState";
import {
  ICP_LEDGER_CANISTER_ID,
  ICP_LEDGER_FEE,
} from "$modules/token/constants";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import type { AssetAndFeeList } from "$modules/shared/types/feeService";
import { FeeType } from "$modules/links/types/fee";
import { feeService } from "$modules/shared/services/feeService";
import {
  FlowDirection,
  type FlowDirectionValue,
} from "$modules/transactionCart/types/transactionSource";
import {
  AssetProcessState,
  AssetProcessStateMapper,
  type AssetItem,
} from "$modules/transactionCart/types/txCart";
import type { FeeItem } from "$modules/links/types/fee";
import {
  calculateIntentFees,
  IntentParticipants,
  TokenStandard as SharedTokenStandard,
} from "$shared";

const LINK_CREATION_FEE_AMOUNT = 10_000n;

/**
 * Map IntentTask to IntentParticipants for shared fee calculation.
 */
function intentTaskToParticipants(
  task: string,
): IntentParticipants | null {
  switch (task) {
    case IntentTask.TRANSFER_WALLET_TO_TREASURY:
      return IntentParticipants.CreatorToTreasury;
    case IntentTask.TRANSFER_WALLET_TO_LINK:
      return IntentParticipants.CreatorToLink;
    case IntentTask.TRANSFER_LINK_TO_WALLET:
      return IntentParticipants.LinkToUser;
    default:
      return null;
  }
}

/**
 * Build AssetAndFeeList from Action using shared fee-calculations.ts logic.
 * Use this for TIP_SHARED_TEST so modal amounts match preview and backend.
 */
export function buildAssetAndFeeFromActionShared(
  action: Action,
  tokens: Record<string, TokenWithPriceAndBalance>,
  currentWalletPrincipal: string,
  maxUse: number,
): AssetAndFeeList {
  return action.intents.map((intent) => {
    const address = intent.type.payload.asset.address.toString();
    const token = tokens[address];
    const direction: FlowDirectionValue = feeService.getFlowDirection(
      intent.type.payload,
      currentWalletPrincipal,
    );

    let feeType = FeeType.NETWORK_FEE;
    if (intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY) {
      feeType = FeeType.CREATE_LINK_FEE;
    }
    const label =
      intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY
        ? "Create link fee"
        : "";

    const participants = intentTaskToParticipants(intent.task);
    const decimals = token?.decimals ?? 8;
    const symbol = token?.symbol ?? "N/A";
    const ledgerFee = token?.fee ?? ICP_LEDGER_FEE;
    const tokenStandard =
      address === ICP_LEDGER_CANISTER_ID
        ? SharedTokenStandard.ICRC2
        : SharedTokenStandard.ICRC1;

    let forecastAmount: bigint;
    let feeRaw: bigint | undefined;

    if (participants === IntentParticipants.CreatorToTreasury) {
      const result = calculateIntentFees({
        intent_participants: participants,
        token_standard: tokenStandard,
        link_creation_fee: LINK_CREATION_FEE_AMOUNT,
        asset_network_fee: ledgerFee,
      });
      forecastAmount = BigInt(result.intent_total_amount);
      feeRaw = BigInt(result.intent_user_fee);
    } else if (participants === IntentParticipants.CreatorToLink) {
      const payloadAmount = intent.type.payload.amount;
      const result = calculateIntentFees({
        intent_participants: participants,
        token_standard: tokenStandard,
        user_input_amount: payloadAmount,
        max_use: maxUse,
        asset_network_fee: ledgerFee,
      });
      const totalAmount = BigInt(result.intent_total_amount);
      const totalNetworkFee = BigInt(result.intent_total_network_fee);
      forecastAmount = totalAmount + totalNetworkFee;
      feeRaw = totalNetworkFee;
    } else if (participants === IntentParticipants.LinkToUser) {
      const result = calculateIntentFees({
        intent_participants: participants,
        token_standard: tokenStandard,
        user_input_amount: intent.type.payload.amount,
        asset_network_fee: ledgerFee,
      });
      forecastAmount = BigInt(result.intent_total_amount);
      feeRaw = BigInt(result.intent_total_network_fee);
    } else {
      // Fallback for unmapped task: use payload amount and single ledger fee
      forecastAmount = intent.type.payload.amount + ledgerFee;
      feeRaw = ledgerFee;
    }

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
      amountFormattedStr: token ? formatNumber(amountUi) : amountUi.toString(),
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
