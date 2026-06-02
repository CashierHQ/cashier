import { locale } from "$lib/i18n";
import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import { omnityIcpService } from "$modules/bitcoin/services/omnityIcpService";
import type { BridgeTransaction } from "$modules/bitcoin/types/bridge_transaction";
import { calculateMaxSendAmount } from "$modules/links/utils/amountCalculator";
import {
  formatBalanceUnits,
  parseBalanceUnits,
} from "$modules/shared/utils/converter";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { icpLedgerService } from "$modules/token/services/icpLedger";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import { walletStore } from "$modules/token/state/walletStore.svelte";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { TxState } from "$modules/wallet/types/walletSendStore";
import { ReceiveAddressType } from "$modules/wallet/types/index";
import {
  isValidAccountId,
  isValidPrincipal,
} from "$modules/wallet/utils/address";
import { Err, Ok, type Result } from "ts-results-es";

class WalletSendStore {
  txState = $state<TxState>(TxState.CONFIRM);

  /**
   * Validate the send form inputs before proceeding to transaction confirmation.
   * Checks that a token is selected, the recipient address is non-empty and valid for
   * the chosen address type (Bitcoin, Principal, or Account ID), the amount is positive,
   * and the amount does not exceed the spendable maximum.
   *
   * @param selectedToken - Canister ID of the token being sent.
   * @param receiveAddress - Recipient address string (Bitcoin, Principal, or Account ID).
   * @param amount - Amount to send in human-readable units (e.g. 0.001 BTC).
   * @param receiveType - Whether the recipient address is a Principal or Account ID (ignored when isBitcoinAddress is true).
   * @param maxAmount - Maximum spendable amount in human-readable units.
   * @param isBitcoinAddress - When true, validates receiveAddress as a Bitcoin address.
   *   Defaults to true for ckBTC, false for all other tokens.
   * @returns Ok(true) if all inputs are valid, Err with a localised error message otherwise.
   */
  validateSend(
    selectedToken: string,
    receiveAddress: string,
    amount: number,
    receiveType: ReceiveAddressType,
    maxAmount: number,
    isBitcoinAddress: boolean = selectedToken === CKBTC_CANISTER_ID,
  ): Result<true, string> {
    if (!selectedToken || selectedToken.trim() === "") {
      return Err(locale.t("wallet.send.errors.selectToken"));
    }

    if (!receiveAddress || receiveAddress.trim() === "") {
      return Err(locale.t("wallet.send.errors.enterAddress"));
    }

    if (isBitcoinAddress) {
      const normalizedAddress = receiveAddress.trim().toLowerCase();
      const isBitcoinLikeAddress =
        /^(bc1|tb1|bcrt1)[a-z0-9]{11,87}$/.test(normalizedAddress) ||
        /^[13mn2][a-km-zA-HJ-NP-Z1-9]{25,62}$/.test(receiveAddress.trim());

      if (!isBitcoinLikeAddress) {
        return Err(locale.t("wallet.send.errors.invalidBitcoinAddress"));
      }
    } else if (receiveType === ReceiveAddressType.PRINCIPAL) {
      const principalResult = isValidPrincipal(receiveAddress);
      if (principalResult.isErr()) {
        return Err(locale.t("wallet.send.errors.invalidPrincipal"));
      }
    } else if (receiveType === ReceiveAddressType.ACCOUNT_ID) {
      const accountResult = isValidAccountId(receiveAddress);
      if (accountResult.isErr()) {
        return Err(locale.t("wallet.send.errors.invalidAccountId"));
      }
    }

    if (amount <= 0) {
      return Err(locale.t("wallet.send.errors.amountGreaterThanZero"));
    }

    if (amount > maxAmount) {
      return Err(
        locale
          .t("wallet.send.errors.amountExceedsMax")
          .replace("{{max}}", String(maxAmount)),
      );
    }

    return Ok(true);
  }

  /**
   * Create a ckBTC export bridge transaction to withdraw ckBTC back to native Bitcoin.
   * Fetches the minter's minimum withdrawal amount and current fee estimate, validates that
   * the requested amount meets the minimum and that the total debit (amount + fees) does not
   * exceed the user's spendable ckBTC balance, then persists the bridge record.
   *
   * @param nativeBtcAddress - Recipient native Bitcoin address.
   * @param amount - Amount to withdraw in human-readable ckBTC units (e.g. 0.001).
   * @param selectedTokenObj - Full token metadata and balance for the ckBTC token.
   * @returns Ok with the created BridgeTransaction on success,
   *   Err with a localised error message if validation fails or the canister call fails.
   */
  async createCkBtcExportBridge(
    nativeBtcAddress: string,
    amount: number,
    selectedTokenObj: TokenWithPriceAndBalance,
  ): Promise<Result<BridgeTransaction, string>> {
    const amountBigInt = formatBalanceUnits(amount, selectedTokenObj.decimals);

    try {
      const minterInfo = await ckBTCMinterService.getMinterInfo();
      if (amountBigInt < minterInfo.retrieve_btc_min_amount) {
        const minAmount = parseBalanceUnits(
          minterInfo.retrieve_btc_min_amount,
          selectedTokenObj.decimals,
        ).toFixed(selectedTokenObj.decimals);
        return Err(
          locale
            .t("wallet.send.errors.amountBelowWithdrawalMin")
            .replace("{{min}}", minAmount),
        );
      }

      const withdrawalFee =
        await ckBTCMinterService.getWithdrawalFee(amountBigInt);
      const totalDebit =
        amountBigInt + withdrawalFee.minter_fee + withdrawalFee.bitcoin_fee;
      const maxAmountResult = calculateMaxSendAmount(
        selectedTokenObj.address,
        walletStore.query.data ?? [],
      );

      if (maxAmountResult.isErr() || totalDebit > maxAmountResult.unwrap()) {
        return Err(locale.t("wallet.send.errors.amountExceedsWithdrawalMax"));
      }

      const createResult =
        await tokenStorageService.createExportBridgeTransaction(
          nativeBtcAddress,
          amountBigInt,
          withdrawalFee.minter_fee,
          withdrawalFee.bitcoin_fee,
        );

      if (createResult.isErr()) {
        return Err(createResult.unwrapErr());
      }

      return Ok(createResult.unwrap());
    } catch (error) {
      return Err((error as Error).message);
    }
  }

  /**
   * Create a Rune export bridge transaction to withdraw a Rune from ICP back to Bitcoin.
   * Fetches the Omnity ICP redeem fee and validates that the user's ICP balance is sufficient
   * to cover it. If the balance check passes, persists the bridge record with the redeem fee
   * stored so the execution step can reference it without a second fee lookup.
   *
   * @param nativeBtcAddress - Recipient native Bitcoin address.
   * @param amount - Amount to withdraw in human-readable Rune units.
   * @param selectedTokenObj - Full token metadata and balance for the Rune token,
   *   must include valid runeInfo (runeId).
   * @returns Ok with the created BridgeTransaction on success,
   *   Err with a localised error message if the ICP balance is insufficient,
   *   the fee fetch fails, or the canister call fails.
   */
  async createRuneExportBridge(
    nativeBtcAddress: string,
    amount: number,
    selectedTokenObj: TokenWithPriceAndBalance,
  ): Promise<Result<BridgeTransaction, string>> {
    try {
      const feeResult = await omnityIcpService.getRedeemFee("Bitcoin");
      if (feeResult.isErr()) {
        return Err(feeResult.unwrapErr());
      }
      const redeemFee = feeResult.unwrap();

      const icpBalance = await icpLedgerService.getBalance();
      if (icpBalance < redeemFee) {
        return Err(
          locale
            .t("wallet.send.errors.insufficientIcpForRuneFee")
            .replace("{{amount}}", String(parseBalanceUnits(redeemFee, 8))),
        );
      }

      const amountBigInt = formatBalanceUnits(
        amount,
        selectedTokenObj.decimals,
      );
      const createResult =
        await tokenStorageService.createRuneExportBridgeTransaction({
          receiverBtcAddress: nativeBtcAddress,
          runeId: selectedTokenObj.runeInfo!.runeId,
          amount: amountBigInt,
          decimals: selectedTokenObj.decimals,
          withdrawalFee: redeemFee,
        });

      if (createResult.isErr()) {
        return Err(createResult.unwrapErr());
      }

      return Ok(createResult.unwrap());
    } catch (error) {
      return Err((error as Error).message);
    }
  }
}

export const walletSendStore = new WalletSendStore();
