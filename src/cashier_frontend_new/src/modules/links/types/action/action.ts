import type { Principal } from "@dfinity/principal";
import { ActionTypeMapper, type ActionTypeValue } from "./actionType";
import { ActionState, ActionStateMapper } from "./actionState";
import Intent, { IntentMapper } from "./intent";
import type {
  ActionDto,
  Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import Icrc112Request from "$modules/icrc112/types/icrc112Request";

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
          Icrc112Request.fromBackendType(r),
        ),
      );
    }

    return new Action(action.id, action.creator, type, state, intents, icrc);
  }
}

export default Action;
