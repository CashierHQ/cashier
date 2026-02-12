import type { IcrcError } from "./common-types";

/** Format IcrcError into human-readable string for logging/messages */
export function formatIcrcError(error: IcrcError): string {
  const { variant, details } = error;
  if (!details) return variant;

  const d = details as Record<string, unknown>;
  switch (variant) {
    case "BadFee":
      return `${variant}: expected_fee=${d.expected_fee}`;
    case "BadBurn":
      return `${variant}: min_burn_amount=${d.min_burn_amount}`;
    case "InsufficientFunds":
      return `${variant}: balance=${d.balance}`;
    case "InsufficientAllowance":
      return `${variant}: allowance=${d.allowance}`;
    case "AllowanceChanged":
      return `${variant}: current_allowance=${d.current_allowance}`;
    case "CreatedInFuture":
    case "Expired":
      return `${variant}: ledger_time=${d.ledger_time}`;
    case "Duplicate":
      return `${variant}: duplicate_of=${d.duplicate_of}`;
    case "GenericError":
    case "GenericBatchError":
      return `${variant}: [${d.error_code}] ${d.message}`;
    default:
      return variant;
  }
}
