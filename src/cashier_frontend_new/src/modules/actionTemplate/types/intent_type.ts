import { type IntentType as BackendSharedIntentType } from "$lib/generated/cashier_backend/cashier_backend.did";
import { assertUnreachable, rsMatch } from "$lib/rsMatch";
import { IntentType as SharedIntentType } from "$shared";

export type SharedIntentTypeValue =
  | typeof SharedIntentType.Send
  | typeof SharedIntentType.Receive;

/**
 * Mapper for converting between frontend SharedIntentType and backend IntentType
 */
export class SharedIntentTypeMapper {
  /**
   * Convert frontend SharedIntentType to corresponding backend IntentType
   * @param intentType
   * @returns
   */
  static toBackendType(
    intentType: SharedIntentTypeValue,
  ): BackendSharedIntentType {
    switch (intentType) {
      case SharedIntentType.Send:
        return { Send: null };
      case SharedIntentType.Receive:
        return { Receive: null };
      default:
        return assertUnreachable(intentType);
    }
  }

  /**
   * Convert backend IntentType to corresponding frontend SharedIntentType
   * @param intentType
   * @returns
   */
  static toLocalType(intentType: BackendSharedIntentType): SharedIntentType {
    return rsMatch(intentType, {
      Send: () => SharedIntentType.Send,
      Receive: () => SharedIntentType.Receive,
    });
  }
}
