import type {
  ActionDto,
  Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import type Icrc112Request from "$modules/icrc112/types/icrc112Request";
import { Icrc112RequestMapper } from "$modules/icrc112/types/icrc112Request";
import type { Principal } from "@dfinity/principal";
import type { ActionState } from "./actionState";
import { ActionStateMapper } from "./actionState";
import { ActionTypeMapper, type ActionTypeValue } from "./actionType";
import type Intent from "./intent";
import { IntentMapper } from "./intent";

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
}

export type ProcessActionResult = {
  action: Action;
  isSuccess: boolean;
  errors: string[];
};

export class ProcessActionResultMapper {
  static fromBackendType(
    result: cashierBackend.ProcessActionDto,
  ): ProcessActionResult {
    const action = ActionMapper.fromBackendType(result.action);
    return {
      action,
      isSuccess: result.is_success,
      errors: result.errors,
    };
  }
}

export default Action;
