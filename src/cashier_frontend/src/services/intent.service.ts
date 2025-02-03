import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import { _SERVICE } from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
class IntentService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
    }

    async confirmIntent(link_id: string, intent_id: string) {
        return parseResultResponse(await this.actor.confirm_action({ link_id, intent_id }));
    }
}

export default IntentService;
