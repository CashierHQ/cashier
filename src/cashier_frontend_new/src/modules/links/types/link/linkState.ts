import { assertUnreachable } from "$lib/rsMatch";
import { LinkState as SharedLinkState } from "$shared";

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
  static fromSharedLinkState(state: SharedLinkState): LinkStateValue {
    switch (state) {
      case SharedLinkState.ChooseType:
        return LinkState.CHOOSING_TYPE;
      case SharedLinkState.AddAsset:
        return LinkState.ADDING_ASSET;
      case SharedLinkState.Preview:
        return LinkState.PREVIEW;
      case SharedLinkState.Inactive:
        return LinkState.INACTIVE;
      case SharedLinkState.Active:
        return LinkState.ACTIVE;
      case SharedLinkState.Created:
        return LinkState.CREATE_LINK;
      case SharedLinkState.Ended:
        return LinkState.INACTIVE_ENDED;
      default:
        assertUnreachable(state);
    }
  }
}
