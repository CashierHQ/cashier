import type { ActionType } from "$modules/links/types/action/actionType";
import type Intent from "$modules/links/types/action/intent";

/**
 * Input type for computeAmountAndFee function in FeeService
 */
export type ComputeAmountAndFeeInput = {
  intent: Intent;
  ledgerFee: bigint;
  actionType: ActionType;
};
/**
 * Output type for computeAmountAndFee function in FeeService
 */
export type ComputeAmountAndFeeOutput = {
  amount: bigint;
  fee?: bigint;
};
