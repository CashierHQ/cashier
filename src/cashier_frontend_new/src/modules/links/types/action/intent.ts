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

  // Devalue serde for Intent
  static serde = {
    serialize: {
      Intent: (value: unknown) => {
        return (
          value instanceof Intent && {
            id: value.id,
            task: IntentTaskMapper.serde.serialize.IntentTask(value.task),
            type: IntentTypeMapper.serde.serialize.IntentType(value.type),
            created_at: value.created_at,
            state: IntentStateMapper.serde.serialize.IntentState(value.state),
          }
        );
      },
    },
    deserialize: {
      Intent: (obj: unknown) => {
        const s = obj as ReturnType<typeof IntentMapper.serde.serialize.Intent>;
        if (!s) {
          throw new Error("Invalid serialized Intent object");
        }

        const taskVal = IntentTaskMapper.serde.deserialize.IntentTask(s.task);
        const typeVal = IntentTypeMapper.serde.deserialize.IntentType(s.type);
        const stateVal = IntentStateMapper.serde.deserialize.IntentState(
          s.state,
        );

        return new Intent(s.id, taskVal, typeVal, s.created_at, stateVal);
      },
    },
  };
}

export default Intent;
