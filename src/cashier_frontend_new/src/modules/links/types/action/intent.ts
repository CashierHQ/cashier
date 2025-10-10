import type { IntentDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import IntentState from "./intentState";
import IntentTask from "./intentTask";
import IntentType from "./intentType";

export class Intent {
  constructor(
    public id: string,
    public task: IntentTask,
    public type: IntentType,
    public created_at: bigint,
    public state: IntentState,
  ) {}

  static fromBackendType(dto: IntentDto) {
    const task = IntentTask.fromBackendType(dto.task);
    const type = IntentType.fromBackendType(dto.type);
    const state = IntentState.fromBackendType(dto.state);
    console.log("intennt", task, type, state);
    return new Intent(dto.id, task, type, dto.created_at, state);
  }
}

export default Intent;
