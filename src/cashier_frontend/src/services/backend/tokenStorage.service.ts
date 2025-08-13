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
} from "../../generated/token_storage/token_storage.did";
import { Actor, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { TOKEN_STORAGE_CANISTER_ID } from "@/const";
import { getAgent } from "@/utils/agent";
import { mapStringToTokenId } from "@/types/token-store.type";

/**
 * Service for interacting with the token storage canister
 * Handles token management, user preferences, and balance operations
 */
class TokenStorageService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        const agent = getAgent(identity);
        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: TOKEN_STORAGE_CANISTER_ID,
        });
    }
    async listTokens(): Promise<TokenListResponse> {
        const response = parseResultResponse(await this.actor.list_tokens());
        return response;
    }
    async addToken(input: AddTokenInput): Promise<null> {
        console.log("Adding token:", input);
        const res = parseResultResponse(await this.actor.add_token(input));
        console.log("Add token result:", res);
        return res;
    }
    async addTokens(input: AddTokensInput): Promise<null> {
        const res = parseResultResponse(await this.actor.add_token_batch(input));
        return res;
    }

    async updateTokenRegistryBatch(ids: { tokenId: string; chain: string }[]): Promise<null> {
        const ids_update = ids.map((id) => mapStringToTokenId(id.tokenId, id.chain));
        const res = parseResultResponse(
            await this.actor.update_token_registry_batch({ token_ids: ids_update }),
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
            chain: string;
        }[],
    ): Promise<void> {
        const balancesInput: UpdateTokenBalanceInput[] = balances.map((balance) => ({
            token_id: mapStringToTokenId(balance.tokenId, balance.chain),
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
