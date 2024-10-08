import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { BACKEND_CANISTER_ID } from "@/const";
import { _SERVICE } from "../../../declarations/cashier_backend/cashier_backend.did";

class UserService {
    private actor: _SERVICE;

    constructor(identity: Identity | PartialIdentity | undefined) {
        this.actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
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
