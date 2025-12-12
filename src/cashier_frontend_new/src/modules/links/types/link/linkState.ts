import type { LinkState as BackendLinkState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";

export class LinkState {
  private constructor() {}

  static readonly CHOOSING_TYPE = "CHOOSING_TYPE";
  static readonly ADDING_ASSET = "ADDING_ASSET";
  static readonly PREVIEW = "PREVIEW";
  static readonly INACTIVE = "INACTIVE";
  static readonly ACTIVE = "ACTIVE";
  static readonly CREATE_LINK = "CREATE_LINK";
  static readonly INACTIVE_ENDED = "INACTIVE_ENDED";
}

export type LinkStateValue =
  | typeof LinkState.CHOOSING_TYPE
  | typeof LinkState.ADDING_ASSET
  | typeof LinkState.PREVIEW
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
      case LinkState.CHOOSING_TYPE:
      case LinkState.ADDING_ASSET:
      case LinkState.PREVIEW:
        throw new Error(`Cannot convert link state ${value} to backend type`);
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
