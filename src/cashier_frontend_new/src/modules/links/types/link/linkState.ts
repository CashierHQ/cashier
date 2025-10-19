import type { LinkState as BackendLinkState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";

export class LinkState {
  private constructor(public readonly id: string) {}

  static readonly INACTIVE = new LinkState("INACTIVE");
  static readonly ACTIVE = new LinkState("ACTIVE");
  static readonly CREATE_LINK = new LinkState("CREATE_LINK");
  static readonly INACTIVE_ENDED = new LinkState("INACTIVE_ENDED");

  toBackend(): BackendLinkState {
    return rsMatch(this as unknown as BackendLinkState, {
      Inactive: () => ({ Inactive: null } as BackendLinkState),
      Active: () => ({ Active: null } as BackendLinkState),
      CreateLink: () => ({ CreateLink: null } as BackendLinkState),
      InactiveEnded: () => ({ InactiveEnded: null } as BackendLinkState),
    });
  }

  static fromBackend(b: BackendLinkState): LinkState {
    return rsMatch(b, {
        Inactive: () => LinkState.INACTIVE,
        Active: () => LinkState.ACTIVE,
        CreateLink: () => LinkState.CREATE_LINK,
        InactiveEnded: () => LinkState.INACTIVE_ENDED,
    })
  }
}
