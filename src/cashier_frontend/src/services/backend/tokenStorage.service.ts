// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parseResultResponse } from "@/utils";
import {
    _SERVICE,
    AddTokenInput,
    idlFactory,
    AddTokensInput,
    TokenListResponse,
    UpdateTokenBalanceInput,
    UpdateTokenInput,
    TokenDto,
} from "../../../../declarations/token_storage/token_storage.did";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IC_HOST, IS_LOCAL, TOKEN_STORAGE_CANISTER_ID } from "@/const";

/**
 * Service for interacting with the token storage canister
 * Handles token management, user preferences, and balance operations
 */
class TokenStorageService {
    private actor: _SERVICE;
    private anonActor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        const agent = HttpAgent.createSync({ identity, host: IC_HOST });
        const anonAgent = HttpAgent.createSync({ host: IC_HOST });
        if (IS_LOCAL) {
            agent.fetchRootKey().catch((err: Error) => {
                console.warn(
                    "Unable to fetch root key. Check to ensure that your local replica is running",
                );
                console.error(err);
            });
            anonAgent.fetchRootKey().catch((err: Error) => {
                console.warn(
                    "Unable to fetch root key. Check to ensure that your local replica is running",
                );
                console.error(err);
            });

        }
        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: TOKEN_STORAGE_CANISTER_ID,
        });
        this.anonActor = Actor.createActor(idlFactory, {
            agent: anonAgent,
            canisterId: TOKEN_STORAGE_CANISTER_ID,
        });
    }
    async listTokens(): Promise<TokenListResponse> {
        const response = parseResultResponse(await this.actor.list_tokens());
        return response;
    }
    async addToken(input: AddTokenInput): Promise<null> {
        const res = parseResultResponse(await this.actor.add_token(input));
        return res;
    }
    async addTokens(input: AddTokensInput): Promise<null> {
        const res = parseResultResponse(await this.actor.add_token_batch(input));
        return res;
    }

    async updateTokenRegistryBatch(ids: string[]): Promise<null> {
        const res = parseResultResponse(
            await this.actor.update_token_registry_batch({ token_ids: ids }),
        );
        return res;
    }

    async updateTokenEnable(input: UpdateTokenInput): Promise<null> {
        const res = parseResultResponse(await this.actor.update_token_enable(input));
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

    // Add method to get registry tokens (admin endpoint)
    async getRegistryTokens(): Promise<TokenDto[]> {
        try {
            const response = parseResultResponse(await this.anonActor.list_tokens());
            return response.tokens;
        } catch (error) {
            console.error("Error fetching registry tokens:", error);
            throw error;
        }
    }
}

export default TokenStorageService;
