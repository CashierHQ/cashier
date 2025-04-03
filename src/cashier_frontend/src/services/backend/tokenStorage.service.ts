import { parseResultResponse } from "@/utils";
import { createActor } from "../../../../declarations/token_storage";
import {
    _SERVICE,
    AddTokenInput,
    RemoveTokenInput,
    UserPreference,
    UserPreferenceInput,
    TokenDto,
} from "../../../../declarations/token_storage/token_storage.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IC_HOST, TOKEN_STORAGE_CANISTER_ID } from "@/const";

/**
 * Service for interacting with the token storage canister
 * Handles token management, user preferences, and balance operations
 */
class TokenStorageService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.actor = createActor(TOKEN_STORAGE_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: IC_HOST }),
        });
    }

    /**
     * Lists default tokens from the registry
     */
    async defaultListTokens(): Promise<TokenDto[]> {
        const response = parseResultResponse(await this.actor.default_list_tokens());
        return response;
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
    async listRegistryTokens(): Promise<TokenDto[]> {
        const response = parseResultResponse(await this.actor.list_registry_tokens());
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

    /**
     * Removes a token from the user's list
     */
    async removeToken(input: RemoveTokenInput): Promise<void> {
        parseResultResponse(await this.actor.remove_token(input));
    }

    /**
     * Updates user preferences
     */
    async updateUserPreference(input: UserPreferenceInput): Promise<void> {
        parseResultResponse(await this.actor.update_user_preference(input));
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
