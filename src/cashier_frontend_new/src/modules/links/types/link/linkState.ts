import type { LinkState as BackendLinkState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";

export class LinkState {
  private constructor() {}

  static readonly INACTIVE = "INACTIVE";
  static readonly ACTIVE = "ACTIVE";
  static readonly CREATE_LINK = "CREATE_LINK";
  static readonly INACTIVE_ENDED = "INACTIVE_ENDED";
}

export type LinkStateValue =
  | typeof LinkState.INACTIVE
  | typeof LinkState.ACTIVE
  | typeof LinkState.CREATE_LINK
  | typeof LinkState.INACTIVE_ENDED;

export class LinkStateMapper {
  static toBackend(value: LinkStateValue): BackendLinkState {
    switch (value) {
      case LinkState.INACTIVE:
        return { Inactive: null };
      case LinkState.ACTIVE:
        return { Active: null };
      case LinkState.CREATE_LINK:
        return { CreateLink: null };
      case LinkState.INACTIVE_ENDED:
        return { InactiveEnded: null };
      default:
        assertUnreachable(value);
    }
  }

  static fromBackendType(b: BackendLinkState): LinkStateValue {
    return rsMatch(b, {
      Inactive: () => LinkState.INACTIVE,
      Active: () => LinkState.ACTIVE,
      CreateLink: () => LinkState.CREATE_LINK,
      InactiveEnded: () => LinkState.INACTIVE_ENDED,
    });
  }
}
