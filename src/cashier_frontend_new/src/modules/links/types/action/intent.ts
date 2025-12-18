import type { IntentDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import type IntentStateValue from "./intentState";
import { IntentStateMapper } from "./intentState";
import type IntentTask from "./intentTask";
import { IntentTaskMapper } from "./intentTask";
import type IntentType from "./intentType";
import { IntentTypeMapper } from "./intentType";

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
}

export default Intent;
