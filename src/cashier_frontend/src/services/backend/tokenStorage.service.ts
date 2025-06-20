// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parseResultResponse } from "@/utils";
import {
    _SERVICE,
    AddTokenInput,
    idlFactory,
    AddTokensInput,
    UpdateTokenStatusInput,
    TokenListResponse,
    UpdateTokenBalanceInput,
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
    async addToken(input: AddTokenInput): Promise<TokenListResponse> {
        const res = parseResultResponse(await this.actor.add_token(input));
        return res;
    }
    async addTokens(input: AddTokensInput): Promise<TokenListResponse> {
        const res = parseResultResponse(await this.actor.add_tokens(input));
        return res;
    }
    async updateToken(input: UpdateTokenStatusInput): Promise<TokenListResponse> {
        console.log("updateToken", input);
        const res = parseResultResponse(await this.actor.update_token_status(input));
        console.log("updateToken", res);
        return res;
    }
    async syncTokenList(): Promise<void> {
        try {
            parseResultResponse(await this.actor.sync_token_list());
        } catch (error) {
            console.error("Error syncing token list:", error);
            throw error; // Rethrow the error to handle it in the calling function
        }
    }

    async updateTokenBalances(
        balances: {
            tokenId: string;
            balance: bigint;
        }[],
    ): Promise<void> {
        const balancesInput: UpdateTokenBalanceInput[] = balances.map((balance) => ({
            token_id: balance.tokenId,
            balance: balance.balance,
        }));

        // Handle the response safely
        const response = await this.actor.update_token_balance(balancesInput);

        // Only parse if the response has a format that parseResultResponse can handle
        if (response !== undefined) {
            parseResultResponse(response);
        }
    }
}

export default TokenStorageService;
