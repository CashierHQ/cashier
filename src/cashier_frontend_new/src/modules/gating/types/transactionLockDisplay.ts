import type { GateForUser } from "$lib/generated/cashier_backend/cashier_backend.did";
import type { GateDraft } from "$modules/gating/types/gate";

export type TransactionLockInput = GateDraft | GateForUser;

export type TransactionLockDisplay = {
  type: string;
  labelKey: string;
  value: string;
  canRevealSensitiveValue: boolean;
};
