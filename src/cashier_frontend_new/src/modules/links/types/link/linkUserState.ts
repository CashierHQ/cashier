import type { LinkUserState as BackendLinkUserState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";

export class LinkUserState {
  private constructor() {}

  static readonly COMPLETED = "COMPLETED";
}

export type LinkUserStateValue = typeof LinkUserState.COMPLETED;

export class LinkUserStateMapper {
  static toBackend(value: LinkUserStateValue): BackendLinkUserState {
    switch (value) {
      case LinkUserState.COMPLETED:
        return { Completed: null };
      default:
        assertUnreachable(value);
    }
  }

  static fromBackendType(b: BackendLinkUserState): LinkUserStateValue {
    const res: LinkUserStateValue | undefined = rsMatch(b, {
      // legacy state
      Address: () => undefined,
      // legacy state
      GateClosed: () => undefined,

      GateOpened: () => undefined,
      Completed: () => LinkUserState.COMPLETED,
    });

    if (!res) {
      throw new Error("state is not valid");
    }

    return res;
  }
}
