import { locale } from "$lib/i18n";

interface ValidateFormData {
  selectedToken: string;
  receiveAddress: string;
  amount: number;
  maxAmount: number;
}

type ValidationResult =
  | { success: true }
  | { success: false; errorMessage: string };

export const validate = ({
  selectedToken,
  receiveAddress,
  amount,
  maxAmount,
}: ValidateFormData): ValidationResult => {
  if (!selectedToken || selectedToken.trim() === "") {
    return {
      success: false,
      errorMessage: locale.t("wallet.send.errors.selectToken"),
    };
  }

  if (!receiveAddress || receiveAddress.trim() === "") {
    return {
      success: false,
      errorMessage: locale.t("wallet.send.errors.enterAddress"),
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      errorMessage: locale.t("wallet.send.errors.amountGreaterThanZero"),
    };
  }

  if (amount > maxAmount) {
    return {
      success: false,
      errorMessage: locale
        .t("wallet.send.errors.amountExceedsMax")
        .replace("{{max}}", String(maxAmount)),
    };
  }

  return { success: true };
};
