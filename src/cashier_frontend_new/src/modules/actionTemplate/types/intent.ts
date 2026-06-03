import { type Intent as BackendSharedIntent } from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedAddressTypeMapper } from "$modules/actionTemplate/types/address_type";
import { SharedAssetMapper } from "$modules/actionTemplate/types/asset";
import { SharedIntentStateMapper } from "$modules/actionTemplate/types/intent_state";
import { SharedIntentTypeMapper } from "$modules/actionTemplate/types/intent_type";
import { type Intent as SharedIntent } from "$shared";

/**
 * Mapper for converting between frontend SharedIntent and backend Intent
 */
export class SharedIntentMapper {
  /**
   * Convert frontend SharedIntent to corresponding backend Intent
   * @param intent
   * @returns
   */
  static toBackendType(intent: SharedIntent): BackendSharedIntent {
    return {
      id: intent.id,
      intent_type: SharedIntentTypeMapper.toBackendType(intent.intent_type),
      asset: SharedAssetMapper.toBackendType(intent.asset),
      amount: intent.amount,
      total_amount: intent.total_amount ? [intent.total_amount] : [],
      user_fee: intent.user_fee ? [intent.user_fee] : [],
      network_fee: intent.network_fee ? [intent.network_fee] : [],
      source_address: intent.source_address,
      source_address_type: SharedAddressTypeMapper.toBackendType(
        intent.source_address_type,
      ),
      dest_address: intent.dest_address,
      dest_address_type: SharedAddressTypeMapper.toBackendType(
        intent.dest_address_type,
      ),
      action_id: intent.action_id ? [intent.action_id] : [],
      dependencies: intent.dependencies ? [intent.dependencies] : [],
      intent_state: SharedIntentStateMapper.toBackendType(intent.intent_state),
    };
  }

  /**
   * Convert backend Intent to corresponding frontend SharedIntent
   * @param intent
   * @returns
   */
  static toLocalType(intent: BackendSharedIntent): SharedIntent {
    return {
      id: intent.id,
      intent_type: SharedIntentTypeMapper.toLocalType(intent.intent_type),
      asset: SharedAssetMapper.toLocalType(intent.asset),
      amount: intent.amount,
      total_amount: intent.total_amount ? intent.total_amount[0] : undefined,
      user_fee: intent.user_fee ? intent.user_fee[0] : undefined,
      network_fee: intent.network_fee ? intent.network_fee[0] : undefined,
      source_address: intent.source_address,
      source_address_type: SharedAddressTypeMapper.toLocalType(
        intent.source_address_type,
      ),
      dest_address: intent.dest_address,
      dest_address_type: SharedAddressTypeMapper.toLocalType(
        intent.dest_address_type,
      ),
      action_id: intent.action_id ? intent.action_id[0] : undefined,
      dependencies: intent.dependencies ? intent.dependencies[0] : undefined,
      intent_state: SharedIntentStateMapper.toLocalType(intent.intent_state),
      label: intent.label,
    };
  }
}
