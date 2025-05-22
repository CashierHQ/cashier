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
import {
    _SERVICE,
    AddTokenInput,
    idlFactory,
    AddTokensInput,
    UpdateTokenStatusInput,
    TokenListResponse,
} from "../../../../declarations/token_storage/token_storage.did";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IC_HOST, TOKEN_STORAGE_CANISTER_ID } from "@/const";

/**
 * Service for interacting with the token storage canister
 * Handles token management, user preferences, and balance operations
 */
class TokenStorageService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        const agent = HttpAgent.createSync({ identity, host: IC_HOST });
        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: TOKEN_STORAGE_CANISTER_ID,
        });
    }

    async listTokens(): Promise<TokenListResponse> {
        const response = parseResultResponse(await this.actor.list_tokens());
        return response;
    }
    async addToken(input: AddTokenInput): Promise<void> {
        parseResultResponse(await this.actor.add_token(input));
    }
    async addTokens(input: AddTokensInput): Promise<void> {
        parseResultResponse(await this.actor.add_tokens(input));
    }
    async updateToken(input: UpdateTokenStatusInput): Promise<void> {
        parseResultResponse(await this.actor.update_token_status(input));
    }
    async syncTokenList(): Promise<void> {
        parseResultResponse(await this.actor.sync_token_list());
    }
}

export default TokenStorageService;
