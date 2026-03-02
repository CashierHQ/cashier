import { type TokenStandard as BackendSharedTokenStandard } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { TokenStandard as SharedTokenStandard } from "$shared";

export type SharedTokenStandardValue =
  | typeof SharedTokenStandard.ICRC1
  | typeof SharedTokenStandard.ICRC2;

/**
 * Mapper for converting between frontend SharedTokenStandard and backend TokenStandard
 */
export class SharedTokenStandardMapper {
  /**
   * Convert frontend SharedTokenStandard to corresponding backend TokenStandard
   * @param tokenStandard
   * @returns
   */
  static toBackendType(
    tokenStandard: SharedTokenStandardValue,
  ): BackendSharedTokenStandard {
    switch (tokenStandard) {
      case SharedTokenStandard.ICRC1:
        return { ICRC1: null };
      case SharedTokenStandard.ICRC2:
        return { ICRC2: null };
      default:
        return assertUnreachable(tokenStandard);
    }
  }

  /**
   * Convert backend TokenStandard to corresponding frontend SharedTokenStandard
   * @param tokenStandard
   * @returns
   */
  static toLocalType(
    tokenStandard: BackendSharedTokenStandard,
  ): SharedTokenStandardValue {
    return rsMatch(tokenStandard, {
      ICRC1: () => SharedTokenStandard.ICRC1,
      ICRC2: () => SharedTokenStandard.ICRC2,
    });
  }
}
