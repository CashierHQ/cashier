// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ActionDto } from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { ACTION_STATE, ACTION_TYPE } from "../enum";
import { ActionModel } from "../action.service.types";
import { mapIntentDtoToIntentModel } from "./intent.service.mapper";
import { mapICRC112Request } from "./transaction.service.mapper";
import { fromNullable } from "@dfinity/utils";

// Map Action from back-end to front-end model
export const mapActionModel = (actionDTO: ActionDto | undefined): ActionModel => {
    if (!actionDTO) {
        return {
            id: "",
            creator: "",
            state: ACTION_STATE.CREATED,
            type: ACTION_TYPE.CREATE_LINK,
            intents: [],
        };
    } else {
        return {
            id: actionDTO.id,
            creator: actionDTO.creator,
            type: Object.values(ACTION_TYPE).includes(actionDTO.type as ACTION_TYPE)
                ? (actionDTO.type as ACTION_TYPE)
                : ACTION_TYPE.CREATE_LINK,
            state: Object.values(ACTION_STATE).includes(actionDTO.state as ACTION_STATE)
                ? (actionDTO.state as ACTION_STATE)
                : ACTION_STATE.CREATED,
            intents: actionDTO.intents.map((intent) => mapIntentDtoToIntentModel(intent)),
            icrc112Requests: fromNullable(actionDTO.icrc_112_requests)
                ? fromNullable(actionDTO.icrc_112_requests)?.map((request) => {
                      return request.map((req) => mapICRC112Request(req));
                  })
                : [],
        };
    }
};
