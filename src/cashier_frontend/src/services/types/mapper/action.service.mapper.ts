// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { fromNullable } from "@dfinity/utils";
import { assertNever, getKeyVariant } from ".";
import {
  ActionDto,
  ActionType,
  IntentState,
} from "../../../generated/cashier_backend/cashier_backend.did";
import { ActionModel } from "../action.service.types";
import { ACTION_STATE, ACTION_TYPE } from "../enum";
import { mapIntentDtoToIntentModel } from "./intent.service.mapper";
import { mapICRC112Request } from "./transaction.service.mapper";

// Back-end ActionState variant
type ActionState = IntentState;

// Map back-end ActionType to Front-end ACTION_TYPE enum
const mapActionTypeToEnum = (actionType: ActionType): ACTION_TYPE => {
  const key = getKeyVariant(actionType);
  switch (key) {
    case "Use":
      return ACTION_TYPE.USE;
    case "Withdraw":
      return ACTION_TYPE.WITHDRAW;
    case "CreateLink":
      return ACTION_TYPE.CREATE_LINK;
    case "Claim":
      return ACTION_TYPE.CLAIM;
    case "Pay":
      return ACTION_TYPE.PAY;
    default:
      assertNever(key);
  }
};

// Map back-end ActionState to Front-end ACTION_STATE enum
const mapActionStateToEnum = (actionState: ActionState) => {
  const key = getKeyVariant(actionState);
  switch (key) {
    case "Created":
      return ACTION_STATE.CREATED;
    case "Processing":
      return ACTION_STATE.PROCESSING;
    case "Success":
      return ACTION_STATE.SUCCESS;
    case "Fail":
      return ACTION_STATE.FAIL;
    default:
      assertNever(key);
  }
};

// Map Front-end ACTION_TYPE enum to back-end ActionType
export const mapFrontendActionTypeToActionType = (
  actionType: ACTION_TYPE,
): ActionType => {
  switch (actionType) {
    case ACTION_TYPE.USE:
      return { Use: null };
    case ACTION_TYPE.WITHDRAW:
      return { Withdraw: null };
    case ACTION_TYPE.CREATE_LINK:
      return { CreateLink: null };
    case ACTION_TYPE.CLAIM:
      return { Claim: null };
    case ACTION_TYPE.PAY:
      return { Pay: null };
    default:
      assertNever(actionType);
  }
};

// Map back-end Action DTO to Front-end Action model
export const mapActionModel = (actionDTO: ActionDto): ActionModel => {
  return {
    id: actionDTO.id,
    creator: actionDTO.creator,
    type: mapActionTypeToEnum(actionDTO.type),
    state: mapActionStateToEnum(actionDTO.state),
    intents: actionDTO.intents.map((intent) =>
      mapIntentDtoToIntentModel(intent),
    ),
    icrc112Requests: fromNullable(actionDTO.icrc_112_requests)
      ? fromNullable(actionDTO.icrc_112_requests)?.map((request) => {
          return request.map((req) => mapICRC112Request(req));
        })
      : [],
  };
};
