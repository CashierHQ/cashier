import type { Principal } from "@dfinity/principal";
import { ActionType } from "./actionType";
import { ActionState } from "./actionState";
import Intent from "./intent";
import type {
  ActionDto,
  Icrc112Request as BackendIcrc112Request,
  IntentState as BackendIntentState,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import Icrc112Request from "$modules/icrc112/types/icrc112Request";

// Frontend Action class representing an action entity
class Action {
  constructor(
    public id: string,
    public creator: Principal,
    public type: ActionType,
    public state: ActionState,
    public intents: Array<Intent>,
    public icrc_112_requests?: Icrc112Request[][],
  ) {}

  /**
   * Create an Action instance from backend ActionDto
   * @param action : ActionDto from backend
   * @returns  Action instance
   */
  static fromBackend(action: ActionDto): Action {
    const type = ActionType.fromBackendType(action.type);

    const state = ActionState.fromBackendType(
      action.state as BackendIntentState,
    );

    const intents = action.intents.map((intentDto) =>
      Intent.fromBackendType(intentDto),
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
