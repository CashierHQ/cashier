import { ActionDto } from "../../../../../declarations/cashier_backend/cashier_backend.did";
import { ACTION_TYPE } from "../enum";
import { ActionModel } from "../action.service.types";
import { mapIntentDtoToIntentModel } from "./intent.service.mapper";

// Map Action from back-end to front-end model
export const mapActionModel = (actionDTO: ActionDto | undefined): ActionModel => {
    if (!actionDTO) {
        return {
            id: "",
            creator: "",
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
            intents: actionDTO.intents.map((intent) => mapIntentDtoToIntentModel(intent)),
        };
    }
};
