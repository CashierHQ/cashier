import { ACTION_TYPE } from "./enum";
import { IntentModel } from "./refractor.intent.service.types";

export type ActionModel = {
    id: string;
    creator: string;
    type: ACTION_TYPE;
    intents: IntentModel[];
};
