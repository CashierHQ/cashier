// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
