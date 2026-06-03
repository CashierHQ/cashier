import { type Intent as SharedIntent } from "$shared";
import type IntentStateValue from "$modules/links/types/action/intentState";
import { IntentStateMapper } from "$modules/links/types/action/intentState";
import type IntentTask from "$modules/links/types/action/intentTask";
import { IntentTaskMapper } from "$modules/links/types/action/intentTask";
import type IntentType from "$modules/links/types/action/intentType";
import { IntentTypeMapper } from "$modules/links/types/action/intentType";
import type { AddressType } from "$shared";

// Frontend representation of an Intent
class Intent {
  constructor(
    public id: string,
    public task: IntentTask,
    public type: IntentType,
    public created_at: bigint,
    public state: IntentStateValue,
    public label: string,
    public sourceAddressType?: AddressType,
    public destAddressType?: AddressType,
  ) {}
}

export class IntentMapper {
  static fromSharedType(intent: SharedIntent): Intent {
    const task = IntentTaskMapper.fromSharedType(intent);
    const type = IntentTypeMapper.fromSharedType(intent);
    const state = IntentStateMapper.fromSharedType(intent.intent_state);
    return new Intent(
      intent.id,
      task,
      type,
      0n,
      state,
      intent.label,
      intent.source_address_type,
      intent.dest_address_type,
    );
  }
}

export default Intent;
