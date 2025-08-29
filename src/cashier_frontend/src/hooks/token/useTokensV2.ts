// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMemo } from "react";
import { useTokenStore } from "@/stores/tokenStore";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useTokenData } from "@/contexts/token-data-context";
import { useIdentity } from "@nfid/identitykit/react";

// Main hook that components should use - now much simpler!
export function useTokensV2() {
  // Get UI state from Zustand store
  const {
    filters,
    searchQuery,
    isLoading,
    isLoadingBalances,
    isLoadingPrices,
    isSyncPreferences,
    isImporting,
    error,
    hasBalances,
    setFilters,
    setError,
    setSearchQuery,
  } = useTokenStore();

  const identity = useIdentity();

  // Get enriched data and operations from provider
  const {
    rawTokenList,
    isLoadingMetadata,
    isMetadataEnriched,
    initialTokenHash,
    ...operations
  } = useTokenData();

  // Create a stable key for memoization that accounts for identity changes
  const memoKey = useMemo(() => {
    return {
      identityKey: identity ? identity.getPrincipal().toString() : "anonymous",
      rawTokenListLength: rawTokenList?.length || 0,
      rawTokenListHash:
        rawTokenList
          ?.map((t) => `${t.address}-${t.enabled}-${t.amount}`)
          .join(",") || "",
    };
  }, [identity, rawTokenList]);

  // Data computation methods (memoized for performance)
  const getToken = useMemo(() => {
    return (tokenAddress: string): FungibleToken | undefined => {
      console.log("rawTokenList", rawTokenList, tokenAddress)
      return rawTokenList.find((token) => token.address === tokenAddress);
    };
  }, [rawTokenList, memoKey.identityKey]);

  const getTokenPrice = useMemo(() => {
    return (tokenAddress: string): number | undefined => {
      const token = rawTokenList.find(
        (token) => token.address === tokenAddress,
      );
      return token?.usdConversionRate;
    };
  }, [rawTokenList, memoKey.identityKey]);

  const createTokenMap = useMemo(() => {
    return (): Record<string, FungibleToken> => {
      return rawTokenList.reduce(
        (map, token) => {
          map[token.address] = token;
          return map;
        },
        {} as Record<string, FungibleToken>,
      );
    };
  }, [rawTokenList, memoKey.identityKey]);

  // Memoized sorted tokens computation - enabled tokens first (by amount), then disabled tokens
  const sortedTokens = useMemo((): FungibleToken[] => {
    if (!rawTokenList || rawTokenList.length === 0) {
      return [];
    }

    const tokens = rawTokenList.slice();

    // Separate enabled and disabled tokens
    const enabledTokens = tokens.filter((token) => token.enabled);
    const disabledTokens = tokens.filter((token) => !token.enabled);

    // Sort enabled tokens by amount (highest first)
    enabledTokens.sort((a, b) => {
      const aAmount = a.amount
        ? Number(a.amount) / Math.pow(10, a.decimals || 8)
        : 0;
      const bAmount = b.amount
        ? Number(b.amount) / Math.pow(10, b.decimals || 8)
        : 0;
      return bAmount - aAmount;
    });

    // Sort disabled tokens by name for consistent ordering
    disabledTokens.sort((a, b) => a.name.localeCompare(b.name));

    // Combine: enabled tokens first, then disabled tokens
    return [...enabledTokens, ...disabledTokens];
  }, [rawTokenList, memoKey.identityKey, memoKey.rawTokenListHash]);

  // Memoized display tokens computation
  const displayTokens = useMemo((): FungibleToken[] => {
    if (!rawTokenList || rawTokenList.length === 0) {
      return [];
    }

    let filtered = rawTokenList.slice();

    // Filter enabled tokens only
    filtered = filtered.filter((token) => token.enabled);

    // Sort tokens by USD equivalent, then by balance
    filtered.sort((a, b) => {
      const aHasPrice =
        a.usdEquivalent !== undefined && !isNaN(a.usdEquivalent);
      const bHasPrice =
        b.usdEquivalent !== undefined && !isNaN(b.usdEquivalent);

      if (aHasPrice && !bHasPrice) return -1;
      if (!aHasPrice && bHasPrice) return 1;

      if (aHasPrice && bHasPrice) {
        return (b.usdEquivalent as number) - (a.usdEquivalent as number);
      }

      const aBalance = a.amount
        ? Number(a.amount) / Math.pow(10, a.decimals || 8)
        : 0;
      const bBalance = b.amount
        ? Number(b.amount) / Math.pow(10, b.decimals || 8)
        : 0;

      return bBalance - aBalance;
    });

    return filtered;
  }, [rawTokenList, filters, memoKey.identityKey, memoKey.rawTokenListHash]);

  const searchTokens = useMemo(() => {
    return (query: string): FungibleToken[] => {
      const tokensToSearch = sortedTokens;

      if (!query.trim()) return tokensToSearch;

      const lcQuery = query.toLowerCase().trim();
      return tokensToSearch.filter((token) => {
        return (
          token.name.toLowerCase().includes(lcQuery) ||
          token.symbol.toLowerCase().includes(lcQuery)
        );
      });
    };
  }, [sortedTokens]);

  // Return clean API
  return {
    // Data
    rawTokenList,
    sortedTokens,
    displayTokens,
    filters,
    searchQuery,

    // Loading states
    isLoading,
    isLoadingBalances,
    isLoadingPrices,
    isLoadingMetadata,
    isMetadataEnriched,
    isSyncPreferences,
    isImporting,
    error,
    hasBalances,

    // Initial hash for comparison
    initialTokenHash,

    // Data methods
    getToken,
    getTokenPrice,
    createTokenMap,
    searchTokens,

    // Backend operations (from provider)
    ...operations,

    // UI state setters
    setFilters,
    setError,
    setSearchQuery,
  };
}
