import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
import type { GateDraft } from "$modules/gating/types/gate";

export type PreviewGateDraft = GateDraft | Record<string, unknown>;

export type TransactionLocksDrawerProps = {
  open?: boolean;
  locks?: PreviewGateDraft[];
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
