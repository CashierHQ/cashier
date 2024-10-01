import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { BACKEND_CANISTER_ID } from "@/const";

export const UserService = {
    createUser: async (identity: Identity | PartialIdentity | undefined) => {
        const actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
        const response = parseResultResponse(await actor.create_user());
        return response;
    },
    getUser: async (identity: Identity | PartialIdentity | undefined) => {
        const actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
        const response = parseResultResponse(await actor.get_user());
        return response;
    },
};