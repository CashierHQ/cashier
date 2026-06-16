import { DRAFT_LINK_GATES_STORAGE_KEY_PREFIX } from "$modules/shared/constants";
import type { GateDraft } from "$modules/gating/types/gate";

type DraftGateRecord = Record<string, GateDraft>;

export class DraftGateRepository {
  storeKey(owner: string) {
    return `${DRAFT_LINK_GATES_STORAGE_KEY_PREFIX}.${owner}`;
  }

  private load(owner: string): DraftGateRecord {
    const raw = localStorage.getItem(this.storeKey(owner));
    if (!raw) return {};

    try {
      return JSON.parse(raw) as DraftGateRecord;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse draft gates from storage: ${details}`, {
        cause: error,
      });
    }
  }

  save(owner: string, draftLinkId: string, gateDraft: GateDraft): void {
    const gates = this.load(owner);
    gates[draftLinkId] = gateDraft;
    localStorage.setItem(this.storeKey(owner), JSON.stringify(gates));
  }

  get(owner: string, draftLinkId: string): GateDraft | null {
    return this.load(owner)[draftLinkId] ?? null;
  }

  delete(owner: string, draftLinkId: string): void {
    const gates = this.load(owner);
    delete gates[draftLinkId];
    localStorage.setItem(this.storeKey(owner), JSON.stringify(gates));
  }
}

export const draftGateRepository = new DraftGateRepository();
