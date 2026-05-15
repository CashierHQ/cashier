import type { IntentDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import { type Intent as SharedIntent } from "$shared";
import type IntentStateValue from "$modules/links/types/action/intentState";
import { IntentStateMapper } from "$modules/links/types/action/intentState";
import type IntentTask from "$modules/links/types/action/intentTask";
import { IntentTaskMapper } from "$modules/links/types/action/intentTask";
import type IntentType from "$modules/links/types/action/intentType";
import { IntentTypeMapper } from "$modules/links/types/action/intentType";

// Frontend representation of an Intent
class Intent {
  constructor(
    public id: string,
    public task: IntentTask,
    public type: IntentType,
    public created_at: bigint,
    public state: IntentStateValue,
  ) {}
}

export class IntentMapper {
  /**
   * Convert from backend IntentDto to frontend Intent
   * @param dto IntentDto from backend
   * @returns Intent instance
   */
  static fromBackendType(dto: IntentDto) {
    const task = IntentTaskMapper.fromBackendType(dto.task);
    const type = IntentTypeMapper.fromBackendType(dto.type);
    const state = IntentStateMapper.fromBackendType(dto.state);
    return new Intent(dto.id, task, type, dto.created_at, state);
  }

  static fromSharedType(intent: SharedIntent): Intent {
    const task = IntentTaskMapper.fromSharedType(intent);
    const type = IntentTypeMapper.fromSharedType(intent);
    const state = IntentStateMapper.fromSharedType(intent.intent_state);
    return new Intent(intent.id, task, type, 0n, state);
  }
}

export default Intent;
