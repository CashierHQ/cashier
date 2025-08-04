// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parseResultResponse } from "@/utils";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { BACKEND_CANISTER_ID, IC_HOST, IS_LOCAL } from "@/const";
import { _SERVICE, idlFactory } from "../../../declarations/cashier_backend/cashier_backend.did";

class UserService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        const agent = HttpAgent.createSync({ identity, host: IC_HOST });

        if (IS_LOCAL) {
            agent.fetchRootKey().catch((err: Error) => {
                console.warn(
                    "Unable to fetch root key. Check to ensure that your local replica is running",
                );
                console.error(err);
            });

        }
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
