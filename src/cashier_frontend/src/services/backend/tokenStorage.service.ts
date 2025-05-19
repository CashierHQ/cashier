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
    RemoveTokenInput,
    UserPreference,
    UserFiltersInput,
    TokenDto,
    idlFactory,
    RegistryTokenDto,
    AddTokensInput,
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

    /**
     * Lists user's tokens
     */
    async listTokens(): Promise<TokenDto[]> {
        const response = parseResultResponse(await this.actor.list_tokens());
        return response;
    }

    /**
     * Lists all tokens in the registry
     */
    async listRegistryTokens(): Promise<RegistryTokenDto[]> {
        const response = parseResultResponse(await this.actor.list_registry_tokens([]));
        return response;
    }

    /**
     * Gets user preferences
     */
    async getUserPreference(): Promise<UserPreference> {
        const response = parseResultResponse(await this.actor.get_user_preference());
        return response;
    }

    /**
     * Adds a token to the user's list
     */
    async addToken(input: AddTokenInput): Promise<void> {
        parseResultResponse(await this.actor.add_token(input));
    }

    async addTokens(input: AddTokensInput): Promise<void> {
        parseResultResponse(await this.actor.add_tokens(input));
    }

    /**
     * Removes a token from the user's list
     */
    async removeToken(input: RemoveTokenInput): Promise<void> {
        parseResultResponse(await this.actor.remove_token(input));
    }

    /**
     * Updates user filter preferences
     */
    async updateUserFilters(input: UserFiltersInput): Promise<void> {
        parseResultResponse(await this.actor.update_user_filters(input));
    }

    /**
     * Toggles a single token's visibility
     */
    async toggleTokenVisibility(tokenId: string, hidden: boolean): Promise<void> {
        parseResultResponse(await this.actor.toggle_token_visibility(tokenId, hidden));
    }

    /**
     * Batch toggles multiple tokens' visibility for efficiency
     */
    async batchToggleTokenVisibility(toggles: Array<[string, boolean]>): Promise<void> {
        parseResultResponse(await this.actor.batch_toggle_token_visibility(toggles));
    }

    /**
     * Initialize user tokens (adds default tokens for new users)
     */
    async initializeUserTokens(): Promise<void> {
        parseResultResponse(await this.actor.initialize_user_tokens());
    }

    /**
     * Updates a token's balance in the backend cache
     */
    async updateTokenBalance(tokenId: string, balance: bigint): Promise<void> {
        parseResultResponse(await this.actor.update_token_balance(tokenId, balance));
    }

    /**
     * Updates multiple token balances at once
     */
    async updateBulkTokenBalance(
        balances: {
            tokenId: string;
            balance: bigint;
        }[],
    ): Promise<void> {
        const input: [string, bigint][] = balances.map(({ tokenId, balance }) => [
            tokenId,
            balance,
        ]);

        parseResultResponse(await this.actor.update_bulk_balances(input));
    }
}

export default TokenStorageService;
