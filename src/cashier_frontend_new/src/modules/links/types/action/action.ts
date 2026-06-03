import type Icrc112Request from "$modules/icrc112/types/icrc112Request";
import type { Action as SharedAction } from "$shared";
import type { Principal } from "@icp-sdk/core/principal";
import type { ActionState } from "$modules/links/types/action/actionState";
import { ActionStateMapper } from "$modules/links/types/action/actionState";
import {
  ActionTypeMapper,
  type ActionTypeValue,
} from "$modules/links/types/action/actionType";
import type Intent from "$modules/links/types/action/intent";
import { IntentMapper } from "$modules/links/types/action/intent";

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
  static fromSharedAction(
    action: SharedAction,
    icrc112Requests: Icrc112Request[][] | undefined,
  ): Action {
    const type = ActionTypeMapper.fromSharedType(action.action_type);
    const state = ActionStateMapper.fromSharedType(action.action_state);
    const intents = action.intents.map((intent) =>
      IntentMapper.fromSharedType(intent),
    );
    return new Action(
      action.id,
      action.creator,
      type,
      state,
      intents,
      icrc112Requests,
    );
  }
}

export default Action;
