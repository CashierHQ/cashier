import { parseResultResponse } from "@/utils";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { BACKEND_CANISTER_ID, IC_HOST } from "@/const";
import { _SERVICE, idlFactory } from "../../../declarations/cashier_backend/cashier_backend.did";

class UserService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        const agent = HttpAgent.createSync({ identity, host: IC_HOST });
        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: BACKEND_CANISTER_ID,
        });
    }

    async createUser() {
        const response = parseResultResponse(await this.actor.create_user());
        return response;
    }

    async getUser() {
        const response = parseResultResponse(await this.actor.get_user());
        return response;
    }
}

export default UserService;
