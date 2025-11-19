import { Principal } from "@dfinity/principal";
import { ActionTypeMapper, type ActionTypeValue } from "./actionType";
import { ActionState, ActionStateMapper } from "./actionState";
import Intent, { IntentMapper } from "./intent";
import type {
  ActionDto,
  Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import Icrc112Request, {
  Icrc112RequestMapper,
} from "$modules/icrc112/types/icrc112Request";

// Frontend Action class representing an action entity
class Action {
  constructor(
    public readonly id: string,
    public readonly creator: Principal,
    public readonly type: ActionTypeValue,
    public readonly state: ActionState,
    public readonly intents: Array<Intent>,
    public readonly icrc_112_requests?: Icrc112Request[][],
  ) {}
}

export class ActionMapper {
  /**
   * Create an Action instance from backend ActionDto
   * @param action : ActionDto from backend
   * @returns  Action instance
   */
  static fromBackendType(action: ActionDto): Action {
    const type = ActionTypeMapper.fromBackendType(action.type);

    const state = ActionStateMapper.fromBackendType(action.state);

    const intents = action.intents.map((intentDto) =>
      IntentMapper.fromBackendType(intentDto),
    );

    let icrc: Icrc112Request[][] | undefined = undefined;
    if (action.icrc_112_requests && action.icrc_112_requests.length === 1) {
      const outer = action.icrc_112_requests[0];
      icrc = outer.map((innerArr) =>
        innerArr.map((r: BackendIcrc112Request) =>
          Icrc112RequestMapper.fromBackendType(r),
        ),
      );
    }

    return new Action(action.id, action.creator, type, state, intents, icrc);
  }

  // Devalue serde for Action
  static serde = {
    serialize: {
      Action: (value: unknown) => {
        if (!(value instanceof Action)) return undefined;
        return {
          id: value.id,
          creator: value.creator.toString(),
          type: value.type,
          state: value.state,
          intents: value.intents.map((i) =>
            IntentMapper.serde.serialize.Intent(i),
          ),
          icrc_112_requests: value.icrc_112_requests?.map((outer) =>
            outer.map((r) =>
              Icrc112RequestMapper.serde.serialize.Icrc112Request(r),
            ),
          ),
        };
      },
    },
    deserialize: {
      Action: (obj: unknown) => {
        const s = obj as ReturnType<typeof ActionMapper.serde.serialize.Action>;

        if (!s) {
          throw new Error("Invalid serialized Action object");
        }

        const creator = Principal.fromText(s.creator);
        const typeVal = s.type;
        const stateVal = s.state;
        const intents = (s.intents || []).map((it) =>
          IntentMapper.serde.deserialize.Intent(it),
        );

        const icrc: Icrc112Request[][] | undefined = s.icrc_112_requests?.map(
          (outer) =>
            outer.map((r) =>
              Icrc112RequestMapper.serde.deserialize.Icrc112Request(r),
            ),
        );

        return new Action(s.id, creator, typeVal, stateVal, intents, icrc);
      },
    },
  };
}

export default Action;
