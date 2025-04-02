import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/token_storage";
import {
    _SERVICE,
    AddTokenInput,
    RemoveTokenInput,
    UserPreference,
    UserPreferenceInput,
    TokenDto,
} from "../../../declarations/token_storage/token_storage.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IC_HOST, TOKEN_STORAGE_CANISTER_ID } from "@/const";
import { FungibleToken } from "@/types/fungible-token.speculative";
import {
    mapUserPreferenceToFilters,
    mapUserTokenToFungibleToken,
    TokenFilters,
} from "@/types/token-store.type";
import { TokenUtilService } from "@/services/tokenUtils.service";

/**
 * Service for interacting with the token storage canister
 * Handles token management, user preferences, and balance operations
 */
class TokenService {
    private actor: _SERVICE;
    private tokenUtilService: TokenUtilService | null = null;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.actor = createActor(TOKEN_STORAGE_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: IC_HOST }),
        });

        if (identity) {
            this.tokenUtilService = new TokenUtilService(identity);
        }
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

    /**
     * Fetches tokens, default tokens, and user preferences in a single call
     * to reduce backend round-trips
     */
    async fetchTokensAndPreferences(): Promise<{
        tokens: TokenDto[];
        defaultTokens: TokenDto[];
        preferences: UserPreference;
        filteredTokens: FungibleToken[];
        filters: TokenFilters;
    }> {
        // Fetch tokens and preferences in parallel
        const [tokens, preferences, defaultTokens] = await Promise.all([
            this.listTokens(),
            this.getUserPreference(),
            this.defaultListTokens(),
        ]);

        // Process the data
        const filters = mapUserPreferenceToFilters(preferences);
        const fungibleTokens = tokens.map((token) => mapUserTokenToFungibleToken(token));
        const filteredTokens = this.filterTokens(fungibleTokens, filters);

        return {
            tokens,
            defaultTokens,
            preferences,
            filteredTokens,
            filters,
        };
    }

    /**
     * Filters tokens based on user preference filters
     */
    filterTokens(tokens: FungibleToken[], filters: TokenFilters): FungibleToken[] {
        return (
            tokens
                .filter((token) => {
                    // Apply zero balance filter
                    if (filters.hideZeroBalance && token.amount === BigInt(0)) {
                        return false;
                    }

                    // Apply chain filter
                    if (filters.selectedChain.length > 0) {
                        const hasMatchingChain = filters.selectedChain.some(
                            (backendChain: string) => backendChain === token.chain,
                        );

                        if (!hasMatchingChain) return false;
                    }

                    // Apply unknown token filter
                    if (filters.hideUnknownToken && token.symbol === "???") {
                        return false;
                    }

                    // Apply hidden tokens filter
                    // if (filters.hiddenTokens.includes(token.id)) {
                    //     return false;
                    // }

                    return true;
                })
                // Sort by value (price * amount) descending
                .sort((a, b) => {
                    const aValue = (a.usdConversionRate || 0) * Number(a.amount);
                    const bValue = (b.usdConversionRate || 0) * Number(b.amount);
                    return bValue - aValue;
                })
        );
    }

    /**
     * Toggles a token's enabled status
     */
    async toggleTokenEnabled(tokenId: string, enabled: boolean): Promise<boolean> {
        // Get token details
        const tokens = await this.listTokens();
        const token = tokens.find((t) => t.id === tokenId);

        if (!token) throw new Error("Token not found");

        // Remove the token if it exists
        await this.removeToken({
            token_id: tokenId,
        });

        if (enabled) {
            // Add it back if it should be enabled
            await this.addToken({
                chain: token.chain,
                ledger_id: token.icrc_ledger_id,
                token_id: [tokenId],
            });
        }

        return true;
    }

    /**
     * Updates balances for multiple tokens
     */
    // async updateAllBalances(tokens: FungibleToken[]): Promise<FungibleToken[]> {
    //     if (!this.tokenUtilService || tokens.length === 0) return tokens;

    //     try {
    //         // Get all token addresses
    //         const tokenAddresses = tokens.map((token) => token.address);

    //         // Fetch all balances in parallel
    //         const balances = await Promise.all(
    //             tokenAddresses.map(async (address) => {
    //                 const balanceInfo = await this.tokenUtilService!.balanceOf(address);

    //                 // Update balance in backend cache if token ID is available
    //                 const token = tokens.find(t => t.address === address);
    //                 if (token && token.id) {
    //                     await this.updateTokenBalance(token.id, balanceInfo.toString());
    //                 }

    //                 return {
    //                     address,
    //                     amount: balanceInfo,
    //                 };
    //             })
    //         );

    //         // Update tokens with new balance information
    //         return tokens.map((token) => {
    //             const balanceInfo = balances.find((b) => b.address === token.address);

    //             if (balanceInfo) {
    //                 return {
    //                     ...token,
    //                     amount: balanceInfo.amount,
    //                 };
    //             }

    //             return token;
    //         });
    //     } catch (error) {
    //         console.error("Failed to update token balances:", error);
    //         throw error;
    //     }
    // }

    /**
     * Updates balance for a single token
     */
    // async updateSingleTokenBalance(
    //     tokenAddress: string,
    //     tokens: FungibleToken[]
    // ): Promise<FungibleToken | undefined> {
    //     if (!this.tokenUtilService) return undefined;

    //     try {
    //         // Find the token in tokens
    //         const tokenIndex = tokens.findIndex((t) => t.address === tokenAddress);

    //         if (tokenIndex === -1) {
    //             throw new Error("Token not found");
    //         }

    //         // Fetch balance for the specific token
    //         const balanceInfo = await this.tokenUtilService.balanceOf(tokenAddress);

    //         // Update balance in backend cache if token ID is available
    //         const token = tokens[tokenIndex];
    //         if (token.id) {
    //             await this.updateTokenBalance(token.id, balanceInfo.toString());
    //         }

    //         // Create updated token
    //         return {
    //             ...token,
    //             amount: balanceInfo,
    //         };
    //     } catch (error) {
    //         console.error(`Failed to update token balance for ${tokenAddress}:`, error);
    //         throw error;
    //     }
    // }
}

export default TokenService;
