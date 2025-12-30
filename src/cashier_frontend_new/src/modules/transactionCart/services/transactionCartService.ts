/**
 * TransactionCartService - Analyzes direction from multiple sources (Intent, Wallet Transfer)
 * Decouples UI components from Action type by providing pre-computed direction per asset.
 */
import type Intent from "$modules/links/types/action/intent";
import type Action from "$modules/links/types/action/action";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { feeService } from "$modules/shared/services/feeService";
import type { AssetAndFeeList } from "$modules/shared/types/feeService";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import { FeeType } from "$modules/links/types/fee";

export class TransactionCartService {
  /**
   * Check if intent is outgoing (user is sender)
   * @param intent - Intent to check
   * @param currentWallet - Current user wallet address (Principal.toString())
   * @returns true if from == currentWallet (user sending), false otherwise
   */
  isIntentOutgoing(intent: Intent, currentWallet: string): boolean {
    const fromAddress = intent.type.payload.from.address.toString();
    return fromAddress === currentWallet;
  }

  /**
   * Convert Action to AssetAndFeeList with direction set per intent
   * @param action - Action containing intents
   * @param currentWallet - Current user wallet address
   * @param tokens - Token lookup by address
   * @returns AssetAndFeeList with isOutgoing set per asset
   */
  fromAction(
    action: Action,
    currentWallet: string,
    tokens: Record<string, TokenWithPriceAndBalance>,
  ): AssetAndFeeList {
    // Delegate to feeService but inject direction
    const list = feeService.mapActionToAssetAndFeeList(action, tokens);

    return list.map((item, index) => {
      const intent = action.intents[index];
      const isOutgoing = intent
        ? this.isIntentOutgoing(intent, currentWallet)
        : true;

      return {
        ...item,
        asset: {
          ...item.asset,
          isOutgoing,
        },
      };
    });
  }

  /**
   * Create AssetAndFeeList for wallet transfer (always outgoing)
   * @param sendAmount - Amount to send (raw bigint)
   * @param token - Token being sent
   * @param receiveAddress - Recipient address
   * @returns AssetAndFeeList with single outgoing asset
   */
  fromWalletTransfer(
    sendAmount: bigint,
    token: TokenWithPriceAndBalance,
    receiveAddress: string,
  ): AssetAndFeeList {
    const feeOutput = feeService.computeSendFee(
      sendAmount,
      token,
      receiveAddress,
    );

    return [
      {
        asset: {
          isOutgoing: true, // wallet transfers always outgoing
          state: AssetProcessState.PENDING,
          label: "",
          symbol: feeOutput.symbol,
          address: feeOutput.tokenAddress,
          amount: feeOutput.totalAmount,
          amountFormattedStr: feeOutput.totalAmountFormatted,
          usdValueStr: feeOutput.totalAmountUsdFormatted,
        },
        fee: {
          feeType: FeeType.NETWORK_FEE,
          amount: feeOutput.fee,
          amountFormattedStr: feeOutput.feeFormatted,
          symbol: feeOutput.symbol,
          usdValueStr: feeOutput.feeUsdFormatted,
        },
      },
    ];
  }
}

export const transactionCartService = new TransactionCartService();
