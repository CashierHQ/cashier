import type { LinkState as BackendLinkState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";

export class LinkState {
  private constructor(public readonly id: string) {}

  static readonly INACTIVE = new LinkState("INACTIVE");
  static readonly ACTIVE = new LinkState("ACTIVE");
  static readonly CREATE_LINK = new LinkState("CREATE_LINK");
  static readonly INACTIVE_ENDED = new LinkState("INACTIVE_ENDED");

  toBackend(): BackendLinkState {
    switch (this) {
      case LinkState.INACTIVE:
        return { Inactive: null };
      case LinkState.ACTIVE:
        return { Active: null };
      case LinkState.CREATE_LINK:
        return { CreateLink: null };
      case LinkState.INACTIVE_ENDED:
        return { InactiveEnded: null };
      default:
        assertUnreachable(this);
    }
  }

  static fromBackend(b: BackendLinkState): LinkState {
    return rsMatch(b, {
      Inactive: () => LinkState.INACTIVE,
      Active: () => LinkState.ACTIVE,
      CreateLink: () => LinkState.CREATE_LINK,
      InactiveEnded: () => LinkState.INACTIVE_ENDED,
    });
  }
}
