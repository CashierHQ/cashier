import { type Action as BackendSharedAction } from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionStateMapper } from "$modules/actionTemplate/types/action_state";
import { SharedActionTypeMapper } from "$modules/actionTemplate/types/action_type";
import { SharedAddressTypeMapper } from "$modules/actionTemplate/types/address_type";
import { SharedIntentMapper } from "$modules/actionTemplate/types/intent";
import { type Action as SharedAction } from "$shared";

/**
 * Mapper for converting between frontend SharedAction and backend Action
 */
export class SharedActionMapper {
  /**
   * Convert frontend SharedAction to corresponding backend Action
   * @param action
   * @returns
   */
  static toBackendType(action: SharedAction): BackendSharedAction {
    const intentIds = action.intents.map((intent) => intent.id);
    return {
      id: action.id,
      creator: action.creator,
      creator_address_type: SharedAddressTypeMapper.toBackendType(
        action.creator_address_type,
      ),
      action_type: SharedActionTypeMapper.toBackendType(action.action_type),
      intents: action.intents.map((intent) =>
        SharedIntentMapper.toBackendType(intent),
      ),
      intent_ids: [intentIds],
      link_id: action.link_id ? [action.link_id] : [],
      action_state: SharedActionStateMapper.toBackendType(action.action_state),
    };
  }

  /**
   * Convert backend Action to corresponding frontend SharedAction
   * @param action
   * @returns
   */
  static toLocalType(action: BackendSharedAction): SharedAction {
    return {
      id: action.id,
      creator: action.creator,
      creator_address_type: SharedAddressTypeMapper.toLocalType(
        action.creator_address_type,
      ),
      action_type: SharedActionTypeMapper.toLocalType(action.action_type),
      intents: action.intents.map((intent) =>
        SharedIntentMapper.toLocalType(intent),
      ),
      intent_ids: action.intent_ids.length > 0 ? action.intent_ids[0] : [],
      link_id:
        action.link_id && action.link_id.length > 0
          ? action.link_id[0]
          : undefined,
      action_state: SharedActionStateMapper.toLocalType(action.action_state),
    };
  }
}
