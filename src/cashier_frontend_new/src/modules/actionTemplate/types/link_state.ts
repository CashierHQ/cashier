import { type LinkState as BackendSharedLinkState } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { LinkState as SharedLinkState } from "$shared";

export type SharedLinkStateValue =
  | typeof SharedLinkState.ChooseType
  | typeof SharedLinkState.AddAsset
  | typeof SharedLinkState.Preview
  | typeof SharedLinkState.Created
  | typeof SharedLinkState.Active
  | typeof SharedLinkState.Inactive
  | typeof SharedLinkState.Ended;

/**
 * Mapper for converting between frontend SharedLinkState and backend LinkState
 */
export class SharedLinkStateMapper {
  /**
   * Convert frontend SharedLinkState to corresponding backend LinkState
   * @param linkState
   * @returns
   */
  static toBackendType(linkState: SharedLinkState): BackendSharedLinkState {
    switch (linkState) {
      case SharedLinkState.ChooseType:
        return { ChooseType: null };
      case SharedLinkState.AddAsset:
        return { AddAsset: null };
      case SharedLinkState.Preview:
        return { Preview: null };
      case SharedLinkState.Created:
        return { Created: null };
      case SharedLinkState.Active:
        return { Active: null };
      case SharedLinkState.Inactive:
        return { Inactive: null };
      case SharedLinkState.Ended:
        return { Ended: null };
      default:
        return assertUnreachable(linkState);
    }
  }

  /**
   * Convert backend LinkState to corresponding frontend SharedLinkState
   * @param linkState
   * @returns
   */
  static toLocalType(linkState: BackendSharedLinkState): SharedLinkState {
    return rsMatch(linkState, {
      ChooseType: () => SharedLinkState.ChooseType,
      AddAsset: () => SharedLinkState.AddAsset,
      Preview: () => SharedLinkState.Preview,
      Created: () => SharedLinkState.Created,
      Active: () => SharedLinkState.Active,
      Inactive: () => SharedLinkState.Inactive,
      Ended: () => SharedLinkState.Ended,
    });
  }
}
