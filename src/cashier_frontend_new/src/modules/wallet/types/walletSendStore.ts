import { type Result } from "ts-results-es";

/**
 * Receive address type enum
 */
export enum ReceiveAddressType {
  PRINCIPAL = "PRINCIPAL",
  ACCOUNT_ID = "ACCOUNT_ID",
}

/**
 * Transaction state enum
 * Follows project pattern: SCREAMING_SNAKE_CASE keys with string values
 */
export enum TxState {
  CONFIRM = "CONFIRM",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

/**
 * Validation result using ts-results-es
 * Ok(true) = valid, Err(errorMessage) = invalid
 */
export type ValidationResult = Result<true, string>;
