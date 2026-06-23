import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { GateDraft } from "$modules/gating/types/gate";

/**
 * Backend gate key variants returned by the cashier backend.
 */
export type GateKey = GateForUser["gate"]["key"];

/**
 * Lock shapes supported by the transaction-lock preview/detail drawer.
 */
export type TransactionLockInput = GateDraft | GateForUser;

/**
 * Normalized transaction-lock values ready for UI rendering.
 */
export type TransactionLockDisplay = {
  type: string;
  labelKey: string;
  value: string;
  canRevealSensitiveValue: boolean;
};
