import { locale } from "$lib/i18n";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { Err, Ok, type Result } from "ts-results-es";
import { isValidAccountId, isValidPrincipal } from "./address";
import type { ValidateSendParams } from "$modules/wallet/types/walletSendStore";
import { ReceiveAddressType } from "$modules/wallet/types/index";

/**
 * Validate send form input
 * Returns Ok(true) if valid, Err(errorMessage) if invalid
 */
export function validateSend(params: ValidateSendParams): Result<true, string> {
  const {
    selectedToken,
    receiveAddress,
    amount,
    receiveType,
    maxAmount,
    isBitcoinAddress = selectedToken === CKBTC_CANISTER_ID,
  } = params;

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
