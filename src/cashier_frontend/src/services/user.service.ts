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
