import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
import type { TransactionLockInput } from "$modules/gating/types/transactionLockDisplay";

export type TransactionLocksDrawerProps = {
  open?: boolean;
  locks?: TransactionLockInput[];
  onClose?: () => void;
  onBack?: () => void;
  onOpenChange?: (open: boolean) => void;
};

export type TransactionLockSectionProps = {
  gatingStore?: GatingStore;
  hasLocks?: boolean;
  isEnded?: boolean;
  onLockClick?: () => void;
};
