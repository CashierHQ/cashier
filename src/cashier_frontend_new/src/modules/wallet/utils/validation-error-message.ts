import { locale } from "$lib/i18n";
import { assertUnreachable } from "$lib/rsMatch";
import type { ValidationErrorType } from "$modules/token/services/canister-validation";

/**
 * Maps validation error types to their corresponding i18n translation keys.
 * @param error - The validation error type from token canister validation
 * @returns The i18n translation key for the corresponding error message
 * @see {@link ValidationErrorType} for available error types
 * @throws {Error} If an unhandled error type is passed (compile-time exhaustiveness check)
 */
export function getValidationErrorMessage(error: ValidationErrorType): string {
  switch (error) {
    case "INVALID_LEDGER":
      return locale.t("wallet.import.errors.invalidLedgerCanister");
    case "INVALID_INDEX":
      return locale.t("wallet.import.errors.invalidIndexCanister");
    case "INDEX_LEDGER_MISMATCH":
      return locale.t("wallet.import.errors.indexLedgerMismatch");
    case "TOKEN_EXISTS":
      return locale.t("wallet.import.errors.tokenAlreadyExists");
    case "BACKEND_ERROR":
      return locale.t("wallet.import.errors.backendError");
    default:
      assertUnreachable(error);
  }
}
