import { ACTION_STATE, ACTION_TYPE } from "./enum";
import { IntentModel } from "./intent.service.types";
import { Icrc112RequestModel } from "./transaction.service.types";

export type ActionModel = {
    id: string;
    creator: string;
    type: ACTION_TYPE;
    state: ACTION_STATE;
    intents: IntentModel[];
    icrc112Requests?: Icrc112RequestModel[][];
};
