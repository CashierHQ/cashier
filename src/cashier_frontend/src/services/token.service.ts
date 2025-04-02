import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/token_storage";
import {
    _SERVICE,
    AddTokenInput,
    RemoveTokenInput,
    UserPreference,
    UserPreferenceInput,
    UserTokenDto,
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

    // Basic token operations from original TokenService
    async defaultListTokens(): Promise<UserTokenDto[]> {
        const response = parseResultResponse(await this.actor.default_list_tokens());
        return response;
    }

    async listTokens(): Promise<UserTokenDto[]> {
        const response = parseResultResponse(await this.actor.list_tokens());
        return response;
    }

    async getUserPreference(): Promise<UserPreference> {
        const response = parseResultResponse(await this.actor.get_user_preference());
        return response;
    }

    async addToken(input: AddTokenInput): Promise<void> {
        parseResultResponse(await this.actor.add_token(input));
    }

    async removeToken(input: RemoveTokenInput): Promise<void> {
        parseResultResponse(await this.actor.remove_token(input));
    }

    async updateUserPreference(input: UserPreferenceInput): Promise<void> {
        parseResultResponse(await this.actor.update_user_preference(input));
    }

    // Enhanced methods from TokenAPIService
    async fetchTokensAndPreferences(): Promise<{
        tokens: UserTokenDto[];
        defaultTokens: UserTokenDto[];
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

        console.log("Fetched tokens:", tokens);
        console.log("Fetched default tokens:", defaultTokens);
        console.log("Fetched preferences:", preferences);

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

    filterTokens(tokens: FungibleToken[], filters: TokenFilters): FungibleToken[] {
        // Apply filters
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
                            (backendChain: string) => {
                                return backendChain === token.chain;
                            },
                        );

                        if (!hasMatchingChain) return false;
                    }

                    // Apply unknown token filter - based on whether the token has a name/symbol
                    if (filters.hideUnknownToken && token.symbol === "???") {
                        return false;
                    }

                    return true;
                })
                // Sort by price * amount (descending)
                .sort((a, b) => {
                    const aValue = (a.usdConversionRate || 0) * Number(a.amount);
                    const bValue = (b.usdConversionRate || 0) * Number(b.amount);
                    return bValue - aValue;
                })
        );
    }

    async toggleTokenEnabled(tokenId: string, enabled: boolean): Promise<boolean> {
        // Find the token in raw list by fetching all tokens
        const tokens = await this.listTokens();
        const token = tokens.find(
            (t) => t.icrc_ledger_id && t.icrc_ledger_id.toString() === tokenId,
        );

        if (!token) throw new Error("Token not found");

        // Remove the existing token first
        await this.removeToken({
            chain: token.chain,
            ledger_id: token.icrc_ledger_id,
        });

        // Create a modified version with enabled status toggled
        const updatedToken: AddTokenInput = {
            chain: token.chain,
            ledger_id: token.icrc_ledger_id,
            index_id: token.icrc_index_id,
            symbol: token.symbol,
            decimals: token.decimals,
            enabled: [enabled],
            unknown: token.unknown ? [token.unknown] : [],
        };

        // Add the updated token
        await this.addToken(updatedToken);

        return true;
    }

    async updateAllBalances(tokens: FungibleToken[]): Promise<FungibleToken[]> {
        if (!this.tokenUtilService || tokens.length === 0) return tokens;

        try {
            // Get all token addresses
            const tokenAddresses = tokens.map((token) => token.address);

            // Fetch all balances in parallel
            const balances = await Promise.all(
                tokenAddresses.map(async (address) => {
                    const balanceInfo = await this.tokenUtilService!.balanceOf(address);
                    return {
                        address,
                        amount: balanceInfo,
                    };
                }),
            );

            // Update tokens with new balance information
            const updatedTokens = tokens.map((token) => {
                const balanceInfo = balances.find((b) => b.address === token.address);

                if (balanceInfo) {
                    return {
                        ...token,
                        amount: balanceInfo.amount,
                    };
                }

                return token;
            });

            return updatedTokens;
        } catch (error) {
            console.error("Failed to update token balances:", error);
            throw error;
        }
    }

    async updateSingleTokenBalance(
        tokenAddress: string,
        tokens: FungibleToken[],
    ): Promise<FungibleToken | undefined> {
        if (!this.tokenUtilService) return undefined;

        try {
            // Find the token in tokens
            const tokenIndex = tokens.findIndex((t) => t.address === tokenAddress);

            if (tokenIndex === -1) {
                throw new Error("Token not found");
            }

            // Fetch balance for the specific token
            const balanceInfo = await this.tokenUtilService.balanceOf(tokenAddress);

            // Create updated token
            const updatedToken = {
                ...tokens[tokenIndex],
                amount: balanceInfo,
            };

            return updatedToken;
        } catch (error) {
            console.error(`Failed to update token balance for ${tokenAddress}:`, error);
            throw error;
        }
    }
}

export default TokenService;
