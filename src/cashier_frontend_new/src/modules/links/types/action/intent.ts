import type { IntentDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import IntentState, { IntentStateMapper } from "./intentState";
import IntentTask, { IntentTaskMapper } from "./intentTask";
import IntentType, { IntentTypeMapper } from "./intentType";

// Frontend representation of an Intent
class Intent {
  constructor(
    public id: string,
    public task: IntentTask,
    public type: IntentType,
    public created_at: bigint,
    public state: IntentState,
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
}

export default Intent;
