import axios, { AxiosInstance } from "axios";

import {
    TokenPrice,
    Chain,
    PriceErrorType,
    PriceServiceError,
    TokenInfo,
    TokenListResponse,
} from "@/types/price.service.type";

interface PriceCache {
    prices: Map<string, TokenPrice>;
    lastUpdated: number;
    chain: Chain;
}

/**
 * Service for fetching and managing token prices from different chains
 */
class TokenPriceService {
    private static readonly CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
    private static readonly IC_EXPLORER_API = "https://api.icexplorer.io/api";

    private icExplorerClient: AxiosInstance;
    private priceCache: Map<Chain, PriceCache> = new Map();

    constructor() {
        // Initialize API clients
        this.icExplorerClient = axios.create({
            baseURL: TokenPriceService.IC_EXPLORER_API,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            timeout: 10000, // 10 seconds timeout
        });
    }

    /**
     * Get token price for a specific token
     * @param tokenId - The token address/ID
     * @param chain - The blockchain chain
     * @returns TokenPrice object with price data
     */
    public async getTokenPrice(tokenId: string, chain: Chain): Promise<TokenPrice> {
        if (chain !== Chain.IC) {
            throw new PriceServiceError(
                `Unsupported chain: ${chain}`,
                PriceErrorType.UNSUPPORTED_CHAIN,
            );
        }

        // Try to get from cache first
        const cachedPrice = this.getFromCache(tokenId, chain);
        if (cachedPrice) {
            return cachedPrice;
        }

        // If not in cache, fetch all prices and update cache
        await this.refreshPrices(chain);

        // Try to get from the updated cache
        const price = this.getFromCache(tokenId, chain);
        if (price) {
            return price;
        }

        // If still not found, token doesn't exist
        throw new PriceServiceError(`Token not found: ${tokenId}`, PriceErrorType.TOKEN_NOT_FOUND);
    }

    /**
     * Get prices for multiple tokens at once
     * @param tokenIds - Array of token addresses/IDs
     * @param chain - The blockchain chain
     * @returns Map of token IDs to their price data
     */
    public async getMultipleTokenPrices(
        tokenIds: string[],
        chain: Chain,
    ): Promise<Map<string, TokenPrice>> {
        if (chain !== Chain.IC) {
            throw new PriceServiceError(
                `Unsupported chain: ${chain}`,
                PriceErrorType.UNSUPPORTED_CHAIN,
            );
        }

        // Check if we need to refresh the cache
        const cache = this.priceCache.get(chain);
        if (!cache || Date.now() - cache.lastUpdated > TokenPriceService.CACHE_EXPIRATION_MS) {
            await this.refreshPrices(chain);
        }

        const result = new Map<string, TokenPrice>();

        // Get prices from cache
        for (const tokenId of tokenIds) {
            const price = this.getFromCache(tokenId, chain);
            if (price) {
                result.set(tokenId, price);
            }
        }

        return result;
    }

    /**
     * Get all available token prices for a specific chain
     * @param chain - The blockchain chain
     * @returns Array of token price data
     */
    public async getAllTokenPrices(chain: Chain): Promise<TokenPrice[]> {
        if (chain !== Chain.IC) {
            throw new PriceServiceError(
                `Unsupported chain: ${chain}`,
                PriceErrorType.UNSUPPORTED_CHAIN,
            );
        }

        // Check if we need to refresh the cache
        const cache = this.priceCache.get(chain);
        if (!cache || Date.now() - cache.lastUpdated > TokenPriceService.CACHE_EXPIRATION_MS) {
            await this.refreshPrices(chain);
        }

        const currentCache = this.priceCache.get(chain);
        if (!currentCache) {
            return [];
        }

        return Array.from(currentCache.prices.values());
    }

    /**
     * Calculate USD value for a token amount
     * @param tokenId - Token address/ID
     * @param chain - Blockchain chain
     * @param amount - Amount of tokens
     * @returns USD value or undefined if conversion fails
     */
    public async tokenToUsd(
        tokenId: string,
        chain: Chain,
        amount: number,
    ): Promise<number | undefined> {
        try {
            const priceData = await this.getTokenPrice(tokenId, chain);
            return amount * priceData.price;
        } catch (error) {
            console.error("Error converting token to USD:", error);
            return undefined;
        }
    }

    /**
     * Calculate token amount from USD value
     * @param tokenId - Token address/ID
     * @param chain - Blockchain chain
     * @param usdAmount - Amount in USD
     * @returns Token amount or undefined if conversion fails
     */
    public async usdToToken(
        tokenId: string,
        chain: Chain,
        usdAmount: number,
    ): Promise<number | undefined> {
        try {
            const priceData = await this.getTokenPrice(tokenId, chain);
            if (priceData.price === 0) return undefined;
            return usdAmount / priceData.price;
        } catch (error) {
            console.error("Error converting USD to token:", error);
            return undefined;
        }
    }

    /**
     * Refresh prices for a specific chain and update the cache
     * @param chain - The blockchain chain
     */
    public async refreshPrices(chain: Chain): Promise<void> {
        if (chain !== Chain.IC) {
            throw new PriceServiceError(
                `Unsupported chain: ${chain}`,
                PriceErrorType.UNSUPPORTED_CHAIN,
            );
        }

        try {
            const tokenList = await this.fetchICTokenList();
            this.updateCache(tokenList, chain);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (!error.response) {
                    throw new PriceServiceError(
                        "Network error connecting to price API",
                        PriceErrorType.NETWORK_ERROR,
                    );
                } else {
                    throw new PriceServiceError(
                        `API error: ${error.response.status} - ${error.message}`,
                        PriceErrorType.API_ERROR,
                    );
                }
            }

            throw new PriceServiceError(
                `Failed to fetch prices: ${error instanceof Error ? error.message : String(error)}`,
                PriceErrorType.UNKNOWN_ERROR,
            );
        }
    }

    /**
     * Fetch token list from IC Explorer API
     * @returns Array of token information
     */
    private async fetchICTokenList(): Promise<TokenInfo[]> {
        const response = await this.icExplorerClient.post<TokenListResponse>("/token/list", {
            page: 1,
            size: 300, // Fetch up to 300 tokens
        });

        if (response.data.statusCode !== 600) {
            throw new PriceServiceError(
                `API error: ${response.data.statusCode}`,
                PriceErrorType.API_ERROR,
            );
        }

        return response.data.data.list;
    }

    /**
     * Update the price cache with new data
     * @param tokenList - Array of token information
     * @param chain - The blockchain chain
     */
    private updateCache(tokenList: TokenInfo[], chain: Chain): void {
        const prices = new Map<string, TokenPrice>();
        const now = new Date();

        for (const token of tokenList) {
            try {
                prices.set(token.ledgerId, {
                    ledgerId: token.ledgerId,
                    symbol: token.symbol,
                    name: token.name,
                    price: parseFloat(token.price),
                    priceChange24h: parseFloat(token.priceChange24),
                    marketCap: parseFloat(token.marketCap),
                    volume24h: parseFloat(token.txVolume24),
                    decimals: token.tokenDecimal,
                    lastUpdated: now,
                });
            } catch (e) {
                console.warn(
                    `Failed to parse price data for ${token.symbol} (${token.ledgerId})`,
                    e,
                );
            }
        }

        this.priceCache.set(chain, {
            prices,
            lastUpdated: Date.now(),
            chain,
        });
    }

    /**
     * Get token price from cache
     * @param tokenId - Token address/ID
     * @param chain - Blockchain chain
     * @returns TokenPrice if found in cache, otherwise undefined
     */
    private getFromCache(tokenId: string, chain: Chain): TokenPrice | undefined {
        const cache = this.priceCache.get(chain);
        if (!cache) return undefined;

        // Check if the cache is expired
        if (Date.now() - cache.lastUpdated > TokenPriceService.CACHE_EXPIRATION_MS) {
            return undefined;
        }

        return cache.prices.get(tokenId);
    }

    /**
     * Clear all cached prices
     */
    public clearCache(): void {
        this.priceCache.clear();
    }

    /**
     * Clear cache for a specific chain
     * @param chain - The blockchain chain
     */
    public clearChainCache(chain: Chain): void {
        this.priceCache.delete(chain);
    }
}

// Export a singleton instance
export const tokenPriceService = new TokenPriceService();
export default tokenPriceService;
