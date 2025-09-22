// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
  useCallback,
} from "react";
import { useTokenStore } from "@/stores/tokenStore";
import {
  useAddTokenMutation,
  useUpdateTokenEnableMutation,
  useTokenBalancesQuery,
  useTokenMetadataQuery,
  useTokenPricesQuery,
  useTokenListQuery,
  useMultipleTokenMutation,
} from "../hooks/token-hooks";
import {
  FungibleToken,
  TokenBalanceMap,
} from "@/types/fungible-token.speculative";
import TokenStorageService from "@/services/backend/tokenStorage.service";
import {
  BALANCE_CACHE_LAST_CACHE_TIME_KEY,
  BALANCE_CACHE_LAST_CACHED_BALANCES_KEY,
  BALANCE_CACHE_THRESHOLD_MS,
} from "@/const";
import {
  IcExplorerClient,
  IcExplorerTokenDetail,
} from "@/services/token_price/icExplorerClient";

// Context for enriched token data and operations
interface TokenContextValue {
  // Enriched token data
  rawTokenList: FungibleToken[];

  // Loading states
  isLoadingMetadata: boolean;
  isMetadataEnriched: boolean; // NEW: Flag to track if metadata enrichment is complete

  // Initial hash for comparison purposes
  initialTokenHash: string; // NEW: Hash of the very first token list loaded

  // Backend operations
  addToken: (input: {
    tokenId: string;
    indexId: string | undefined;
    chain: string;
  }) => Promise<void>;
  toggleTokenEnable: (
    tokenId: string,
    enable: boolean,
    chain: string
  ) => Promise<void>;
  updateTokenInit: () => Promise<void>;
  updateTokenExplorer: () => Promise<void>;
  updateTokenBalance: () => Promise<void>;

  // Simplified auto-upgrade functionality
  hasMetadataChanges: boolean;
  changedTokenIds: string[];
  triggerManualComparison: () => Promise<void>;
}

const TokenContext = createContext<TokenContextValue | null>(null);

// Provider component that manages all React Query hooks and data enrichment
export function TokenDataProvider({ children }: { children: ReactNode }) {
  const { pnp, account } = usePnpStore();
  const [enrichedTokens, setEnrichedTokens] = useState<FungibleToken[]>([]);
  const [isMetadataEnriched, setIsMetadataEnriched] = useState<boolean>(false);
  const [initialTokenHash, setInitialTokenHash] = useState<string>("");

  // Simplified auto-upgrade state
  const [hasMetadataChanges, setHasMetadataChanges] = useState<boolean>(false);
  const [changedTokenIds, setChangedTokenIds] = useState<string[]>([]); // Helper function to create token hash
  const createTokenHash = (tokens: FungibleToken[]): string => {
    return tokens
      .map(
        (t) =>
          `${t.id}-${t.symbol}-${t.name}-${t.decimals}-${t.enabled}-${t.fee || "no-fee"}-${t.logoFallback || "no-logo"}`
      )
      .join("|");
  };

  // Get Zustand store actions
  const {
    setIsLoading,
    setIsLoadingBalances,
    setIsLoadingPrices,
    setIsSyncPreferences,
    setIsImporting,
    setFilters,
    setError,
    setHasBalances,
  } = useTokenStore();

  // React Query hooks - only called once at the provider level
  const tokenListQuery = useTokenListQuery();
  const tokenMetadataQuery = useTokenMetadataQuery(tokenListQuery.data?.tokens);
  const tokenBalancesQuery = useTokenBalancesQuery(tokenListQuery.data?.tokens);
  const tokenPricesQuery = useTokenPricesQuery();

  // Mutations - only created once at the provider level
  const addTokenMutation = useAddTokenMutation();
  const addMultipleTokenMutation = useMultipleTokenMutation();
  const updateTokenEnableState = useUpdateTokenEnableMutation();

  // Backend operations - created once and shared
  const addToken = async (input: {
    tokenId: string;
    indexId: string | undefined;
    chain: string;
  }) => {
    console.log("Adding token in context:", input);
    setIsImporting(true);
    try {
      console.log("Adding token:", input);
      await addTokenMutation.mutateAsync(input);
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleTokenEnable = async (
    tokenId: string,
    enable: boolean,
    chain: string
  ) => {
    setIsSyncPreferences(true);
    try {
      await updateTokenEnableState.mutateAsync({ tokenId, enable, chain });
      await tokenListQuery.refetch();
      await tokenBalancesQuery.refetch();
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsSyncPreferences(false);
    }
  };

  const updateTokenInit = async () => {
    try {
      await tokenListQuery.refetch();
    } catch (error) {
      setError(error as Error);
    }
  };

  const updateTokenExplorer = async () => {
    const explorerService = new IcExplorerClient();
    if (!identity) {
      return;
    }

    // Add retry logic for getting token list
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    const getTokenListWithRetry = async (
      retries: number = 0
    ): Promise<IcExplorerTokenDetail[]> => {
      try {
        const result = await explorerService.getListToken();
        return result;
      } catch {
        if (retries < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retries);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return getTokenListWithRetry(retries + 1);
        } else {
          return [];
        }
      }
    };

    try {
      const tokenList = await getTokenListWithRetry();
      if (tokenList.length > 0) {
        const tokenIds = tokenList.map((token) => token.ledgerId);
        await addMultipleTokenMutation.mutateAsync({ tokenIds, chain: "IC" });
        await tokenListQuery.refetch();
      }
    } catch (error) {
      setError(error as Error);
    }
  };

  const updateTokenBalance = async () => {
    try {
      await tokenBalancesQuery.refetch();
    } catch (error) {
      setError(error as Error);
    }
  };

  const updateTokensInRegistry = async (
    tokensToUpdate: { tokenId: string; chain: string }[]
  ): Promise<void> => {
    try {
      if (!pnp) {
        console.warn(
          "No authenticated user - cannot update tokens in registry"
        );
        return;
      }
      const tokenStorageService = new TokenStorageService(pnp);
      await tokenStorageService.updateTokenRegistryBatch(tokensToUpdate);
    } catch (error) {
      console.error("❌ Error updating tokens in registry:", error);
    }
  };

  // Token balance caching logic (moved from TokenCacheService)
  const cacheTokenBalances = async (
    balanceMap: TokenBalanceMap,
    userWallet: string
  ) => {
    const currentTime = Date.now();
    const cacheKey = `${BALANCE_CACHE_LAST_CACHE_TIME_KEY}_${userWallet}`;
    const cacheTimeKey = `${BALANCE_CACHE_LAST_CACHED_BALANCES_KEY}_${userWallet}`;

    const lastCacheTimeString = localStorage.getItem(cacheTimeKey);
    const lastCacheTime = lastCacheTimeString
      ? parseInt(lastCacheTimeString, 10)
      : 0;

    // Get the last cached balances
    const lastCachedBalancesString = localStorage.getItem(cacheKey);
    const lastCachedBalances: TokenBalanceMap = lastCachedBalancesString
      ? JSON.parse(lastCachedBalancesString, (key, value) => {
          // Convert string back to bigint during parsing
          if (key === "amount" && typeof value === "string") {
            return BigInt(value);
          }
          return value;
        })
      : {};

    // Check if any balances have changed
    const balancesChanged = Object.keys(balanceMap).some((tokenId) => {
      const currentAmount = balanceMap[tokenId]?.amount;
      const lastAmount = lastCachedBalances[tokenId]?.amount;

      // If either amount is missing (undefined), consider it changed
      if (currentAmount === undefined || lastAmount === undefined) {
        return true;
      }
      // Compare as strings since bigint can't be directly compared with ===
      return currentAmount.toString() !== lastAmount.toString();
    });

    const timeThresholdMet =
      currentTime - lastCacheTime > BALANCE_CACHE_THRESHOLD_MS;

    // Cache if either balances changed OR time threshold met
    if (balancesChanged || timeThresholdMet) {
      try {
        const balancesToCache = Object.entries(balanceMap)
          .filter(([, balance]) => balance.amount !== undefined)
          .map(([tokenId, balance]) => ({
            tokenId,
            balance: balance.amount!,
            chain: "IC",
          }));

        if (balancesToCache.length > 0) {
          // Save the current time
          localStorage.setItem(cacheTimeKey, currentTime.toString());

          // Save the current balances with special handling for bigint
          const balanceMapJson = JSON.stringify(balanceMap, (key, value) => {
            // Convert bigint to string for JSON serialization
            if (typeof value === "bigint") {
              return value.toString();
            }
            return value;
          });

          localStorage.setItem(cacheKey, balanceMapJson);

          if (balancesChanged && pnp) {
            const tokenStorageService = new TokenStorageService(pnp);
            await tokenStorageService.updateTokenBalances(balancesToCache);
          }
        }
      } catch (error) {
        console.error("Failed to cache balances:", error);
        // Continue even if caching fails
      }
    }
  };

  // Method to manually trigger comparison (simplified)
  const updateAllTokenData = useCallback(async () => {
    await Promise.all([
      tokenMetadataQuery.refetch(),
      tokenBalancesQuery.refetch(),
      tokenPricesQuery.refetch(),
    ]);
    try {
      if (hasMetadataChanges && changedTokenIds.length > 0) {
        setHasMetadataChanges(false);
        setChangedTokenIds([]);
      }
    } catch (error) {
      console.error("❌ Error during manual token update:", error);
    }
  }, [
    tokenMetadataQuery,
    tokenBalancesQuery,
    tokenPricesQuery,
    hasMetadataChanges,
    changedTokenIds.length,
  ]);

  // 1. Set initial token hash when first tokens are loaded
  useEffect(() => {
    if (!tokenListQuery.data?.tokens || initialTokenHash !== "") return;

    const tokens = tokenListQuery.data.tokens;
    if (tokens.length > 0) {
      const firstHash = createTokenHash(tokens);
      setInitialTokenHash(firstHash);
    }
  }, [tokenListQuery.data?.tokens, initialTokenHash, createTokenHash]);

  // 2. Update metadata enriched flag
  useEffect(() => {
    const isCurrentlyEnriched =
      !!tokenMetadataQuery.data &&
      !tokenMetadataQuery.isLoading &&
      !tokenMetadataQuery.isFetching;
    setIsMetadataEnriched(isCurrentlyEnriched);
  }, [
    tokenMetadataQuery.data,
    tokenMetadataQuery.isLoading,
    tokenMetadataQuery.isFetching,
  ]);

  // 3. Main token enrichment effect - combines all data sources
  useEffect(() => {
    if (!tokenListQuery.data?.tokens) return;

    let currentTokens = [...tokenListQuery.data.tokens];

    // Enrich with balances if available
    if (tokenBalancesQuery.data) {
      const balanceMap: Record<string, bigint | undefined> = {};
      tokenBalancesQuery.data.forEach((balance) => {
        if (balance.address && balance.amount !== undefined) {
          balanceMap[balance.address] = balance.amount;
        }
      });

      currentTokens = currentTokens.map((token) => {
        const amount = balanceMap[token.address];
        return amount !== undefined ? { ...token, amount } : token;
      });
    }

    // Enrich with metadata if available
    if (tokenMetadataQuery.data) {
      const changedTokens: string[] = [];
      let hasAnyChanges = false;

      currentTokens = currentTokens.map((token) => {
        const metadata = tokenMetadataQuery.data[token.address];
        if (!metadata) return token;

        const enrichedToken = { ...token };
        let tokenHasChanges = false;

        // Be careful with name and symbol - only update if metadata has better values
        if (metadata.name && metadata.name !== token.name) {
          enrichedToken.name = metadata.name;
          tokenHasChanges = true;
        }

        if (metadata.symbol && metadata.symbol !== token.symbol) {
          enrichedToken.symbol = metadata.symbol;
          tokenHasChanges = true;
        }

        // Track if this token has changes
        if (tokenHasChanges) {
          changedTokens.push(token.id);
          hasAnyChanges = true;
        }

        return enrichedToken;
      });

      // Update global change tracking
      if (hasAnyChanges) {
        setHasMetadataChanges(true);
        setChangedTokenIds(changedTokens);
      }
    }

    // Enrich with prices if available
    if (tokenPricesQuery.data) {
      currentTokens = currentTokens.map((token) => {
        const price = tokenPricesQuery.data[token.address];
        if (!price) return token;

        const enrichedToken = {
          ...token,
          usdConversionRate: price,
        };

        if (token.amount) {
          const amountInNumber =
            Number(token.amount) / Math.pow(10, token.decimals);
          enrichedToken.usdEquivalent = price * amountInNumber;
        } else {
          enrichedToken.usdEquivalent = 0;
        }

        return enrichedToken;
      });
    }

    // Update the enriched tokens state
    setEnrichedTokens(currentTokens);
  }, [
    tokenListQuery.data?.tokens,
    tokenBalancesQuery.data,
    tokenMetadataQuery.data,
    tokenPricesQuery.data,
    enrichedTokens.length,
  ]);

  // 4. Update hasBalances flag when enriched tokens change
  useEffect(() => {
    const hasBalances = enrichedTokens.some(
      (token) => token.amount && token.amount > BigInt(0)
    );
    setHasBalances(hasBalances);
  }, [enrichedTokens, setHasBalances]);

  // 5. Cache token balances when balance data changes
  useEffect(() => {
    if (!account || !tokenBalancesQuery.data) return;

    const balanceMap: TokenBalanceMap = {};
    tokenBalancesQuery.data.forEach((balance) => {
      if (balance.address && balance.amount !== undefined) {
        const id = `${balance.chain}:${balance.address}`;
        balanceMap[id] = { amount: balance.amount };
      }
    });

    if (Object.keys(balanceMap).length > 0) {
      cacheTokenBalances(balanceMap, account?.owner ?? "");
    }
  }, [tokenBalancesQuery.data, cacheTokenBalances]);

  // 6. Auto-upgrade effect - Simplified approach using metadata change flags
  useEffect(() => {
    if (!hasMetadataChanges || changedTokenIds.length === 0) {
      return;
    }

    if (!isMetadataEnriched) {
      return;
    }

    const updateChangedTokens = async () => {
      try {
        await updateTokensInRegistry(
          changedTokenIds.map((tokenId) => ({ tokenId, chain: "IC" }))
        );

        // Reset the flags after successful update
        setHasMetadataChanges(false);
        setChangedTokenIds([]);
      } catch (error) {
        console.error("❌ Failed to update tokens in registry:", error);
      }
    };

    updateChangedTokens();
  }, [account, hasMetadataChanges, changedTokenIds, isMetadataEnriched]);

  // Loading state effects
  useEffect(() => {
    const isLoadingBalancesState =
      tokenBalancesQuery.isLoading || tokenBalancesQuery.isFetching;
    setIsLoadingBalances(isLoadingBalancesState);
  }, [
    tokenBalancesQuery.isLoading,
    tokenBalancesQuery.isFetching,
    setIsLoadingBalances,
  ]);

  useEffect(() => {
    const isLoadingPricesState =
      tokenPricesQuery.isLoading || tokenPricesQuery.isFetching;
    setIsLoadingPrices(isLoadingPricesState);
  }, [
    tokenPricesQuery.isLoading,
    tokenPricesQuery.isFetching,
    setIsLoadingPrices,
  ]);

  useEffect(() => {
    if (tokenListQuery.isFetching && !tokenListQuery.data) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }

    // if (tokenListQuery.data?.needUpdateVersion) {
    //     console.log("Syncing token list due to version update.");
    //     syncTokenListMutation.mutateAsync();
    // }

    if (tokenListQuery.data?.perference) {
      setFilters(tokenListQuery.data.perference);
    }
  }, [
    setIsLoading,
    tokenListQuery.isFetching,
    tokenListQuery.data,
    setFilters,
  ]);

  // Fetch initial token list on mount
  useEffect(() => {
    tokenListQuery.refetch();
  }, []);

  // Context value
  const contextValue: TokenContextValue = {
    rawTokenList: enrichedTokens,
    isLoadingMetadata:
      tokenMetadataQuery.isLoading || tokenMetadataQuery.isFetching,
    isMetadataEnriched,
    initialTokenHash,
    addToken,
    toggleTokenEnable,
    updateTokenInit,
    updateTokenExplorer,
    updateTokenBalance,
    hasMetadataChanges,
    changedTokenIds,
    triggerManualComparison: updateAllTokenData,
  };

  return (
    <TokenContext.Provider value={contextValue}>
      {children}
    </TokenContext.Provider>
  );
}

// Hook to access token data and operations
export function useTokenData() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error("useTokenData must be used within a TokenDataProvider");
  }
  return context;
}
