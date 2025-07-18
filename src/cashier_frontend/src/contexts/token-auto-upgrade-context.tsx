// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import React, { createContext, useEffect, useRef, ReactNode } from "react";
import { useIdentity } from "@nfid/identitykit/react";
import { FungibleToken, TokenModel } from "@/types/fungible-token.speculative";
import TokenStorageService from "@/services/backend/tokenStorage.service";
import { mapTokenDtoToTokenModel } from "@/types/token-store.type";

import { useTokenData } from "./token-data-context";

// Token comparison types
interface TokenComparisonReport {
    totalRegistry: number;
    totalFrontend: number;
    tokensToUpdate: string[]; // Token IDs that need to be updated in registry
    report: {
        missingInFrontend: string[];
        missingInRegistry: string[];
        differentTokens: string[];
    };
}

interface TokenAutoUpgradeContextType {
    compareTokens: (
        registryTokens: FungibleToken[],
        frontendTokens: FungibleToken[],
    ) => TokenComparisonReport;
    triggerManualComparison: () => Promise<void>;
    lastComparisonResult: TokenComparisonReport | null;
}

const TokenAutoUpgradeContext = createContext<TokenAutoUpgradeContextType | undefined>(undefined);

// Simple method to compare registry tokens vs frontend tokens
const compareTokens = (
    registryTokens: FungibleToken[],
    frontendTokens: FungibleToken[],
): TokenComparisonReport => {
    // Create maps for efficient lookup
    const registryMap = new Map<string, FungibleToken>();
    const frontendMap = new Map<string, FungibleToken>();

    registryTokens.forEach((token) => {
        registryMap.set(token.id, token);
    });

    frontendTokens.forEach((token) => {
        frontendMap.set(token.id, token);
    });

    // Find tokens missing in frontend
    const missingInFrontend: string[] = [];
    registryTokens.forEach((token) => {
        if (!frontendMap.has(token.id)) {
            missingInFrontend.push(token.id);
        }
    });

    // Find tokens missing in registry
    const missingInRegistry: string[] = [];
    frontendTokens.forEach((token) => {
        if (!registryMap.has(token.id)) {
            missingInRegistry.push(token.id);
        }
    });

    console.log("registryMap length:", registryMap.size);
    console.log("frontendMap length:", frontendMap.size);

    // Check for differences in common tokens
    const differentTokens: string[] = [];
    registryTokens.forEach((registryToken) => {
        const frontendToken = frontendMap.get(registryToken.id);
        if (frontendToken) {
            // Compare key fields that might be different
            const hasDecimalsDiff = registryToken.decimals !== frontendToken.decimals;
            const hasFeeDiff = registryToken.fee !== frontendToken.fee;
            const hasNameDiff = registryToken.name !== frontendToken.name;
            const hasSymbolDiff = registryToken.symbol !== frontendToken.symbol;

            if (registryToken.address == "wxani-naaaa-aaaab-qadgq-cai") {
                console.log("Comparing wxani token:", {
                    registryToken,
                    frontendToken,
                    hasDecimalsDiff,
                    hasFeeDiff,
                    hasNameDiff,
                    hasSymbolDiff,
                });
            }

            if (hasDecimalsDiff || hasFeeDiff || hasNameDiff || hasSymbolDiff) {
                differentTokens.push(registryToken.id);
            }
        }
    });

    // Tokens that need to be updated in registry (different + missing in registry)
    const tokensToUpdate = [...differentTokens, ...missingInRegistry];

    return {
        totalRegistry: registryTokens.length,
        totalFrontend: frontendTokens.length,
        tokensToUpdate,
        report: {
            missingInFrontend,
            missingInRegistry,
            differentTokens,
        },
    };
};

interface TokenComparisonProviderProps {
    children: ReactNode;
}

export const TokenAutoUpgradeProvider: React.FC<TokenComparisonProviderProps> = ({ children }) => {
    const identity = useIdentity();
    const { rawTokenList, isLoadingMetadata, isMetadataEnriched, initialTokenHash } =
        useTokenData();
    const lastComparisonResultRef = useRef<TokenComparisonReport | null>(null);
    const lastTokensHashRef = useRef<string>("");

    // Method to get registry tokens from backend
    const getRegistryTokens = async (): Promise<TokenModel[]> => {
        try {
            if (!identity) {
                return [];
            }

            const tokenStorageService = new TokenStorageService(identity);
            const tokens = await tokenStorageService.getRegistryTokens();

            const mappedTokens = tokens.map((token) => mapTokenDtoToTokenModel(token));

            return mappedTokens;
        } catch (error) {
            console.error("❌ Error getting registry tokens:", error);
            return [];
        }
    };

    const updateTokensInRegistry = async (tokensToUpdate: string[]): Promise<void> => {
        if (!identity) {
            return;
        }

        try {
            const tokenStorageService = new TokenStorageService(identity);

            // Call backend to update tokens
            await tokenStorageService.updateTokenRegistryBatch(tokensToUpdate);
        } catch (error) {
            console.error("❌ Error updating tokens in registry:", error);
        }
    };

    // Method to perform token comparison
    const performComparison = async (): Promise<void> => {
        try {
            // Get current frontend tokens from the enriched token list (not the store)
            const frontendTokens = rawTokenList;

            console.log("Frontend tokens from rawTokenList:", frontendTokens.length);

            // Get registry tokens from backend
            const registryTokens = await getRegistryTokens();

            if (registryTokens.length === 0) {
                console.log("⚠️ No registry tokens found, skipping comparison");
                return;
            }

            // Perform comparison
            const comparison = compareTokens(registryTokens, frontendTokens);

            // Store result
            lastComparisonResultRef.current = comparison;

            // Log results
            console.log("📊 Token Comparison Results:", {
                totalRegistry: comparison.totalRegistry,
                totalFrontend: comparison.totalFrontend,
                tokensToUpdate: comparison.tokensToUpdate.length,
                missingInFrontend: comparison.report.missingInFrontend.length,
                missingInRegistry: comparison.report.missingInRegistry.length,
                differentTokens: comparison.report.differentTokens.length,
            });

            // Log tokens that need updating
            if (comparison.tokensToUpdate.length > 0) {
                console.warn(
                    "🔄 Tokens that need updating in registry:",
                    comparison.tokensToUpdate,
                );
            }

            if (comparison.tokensToUpdate.length === 0) {
                console.log("✅ No tokens need updating in registry");
                return;
            }

            console.log("tokensToUpdate", comparison.tokensToUpdate);
            updateTokensInRegistry(comparison.tokensToUpdate);

            // Optionally call backend to update tokens
            // await updateTokensInRegistry(comparison.tokensToUpdate);
        } catch (error) {
            console.error("❌ Token comparison failed:", error);
        }
    };

    // Create a simple hash of token list to detect changes
    const getTokenListHash = (tokens: FungibleToken[]): string => {
        return tokens
            .map(
                (t) =>
                    `${t.id}-${t.symbol}-${t.name}-${t.decimals}-${t.enabled}-${t.fee || "no-fee"}-${t.logoFallback || "no-logo"}`,
            )
            .join("|");
    };

    // Check if token data has changed and trigger comparison
    useEffect(() => {
        if (!identity) {
            console.log("⏸️ Skipping token comparison - no identity");
            return;
        }

        if (rawTokenList.length === 0) {
            console.log("⏸️ Skipping token comparison - no tokens loaded");
            return;
        }

        // Wait for metadata to be fully loaded and enriched before running comparison
        if (isLoadingMetadata || !isMetadataEnriched) {
            console.log("⏸️ Skipping token comparison - metadata still loading or not enriched", {
                isLoadingMetadata: isLoadingMetadata,
                isMetadataEnriched: isMetadataEnriched,
                currentHashRef: lastTokensHashRef.current,
                initialTokenHash: initialTokenHash,
            });
            return;
        }

        // Calculate current hash
        const currentHash = getTokenListHash(rawTokenList);
        console.log("🔍 Current token hash:", currentHash);
        console.log("🔍 Last token hash:", lastTokensHashRef.current);
        console.log("🔍 Initial token hash:", initialTokenHash);

        // Use initialTokenHash as the baseline if we haven't set a comparison hash yet
        // This ensures we compare against the very first token state, not enriched state
        if (lastTokensHashRef.current === "" && initialTokenHash) {
            console.log("🆕 Using initial token hash as baseline for comparison");
            lastTokensHashRef.current = initialTokenHash;

            // Check if current tokens (with metadata) differ from initial tokens
            const hasChanged = currentHash !== initialTokenHash;
            if (hasChanged) {
                console.log("🔄 Triggering comparison - tokens changed from initial state...");
                performComparison();
            } else {
                console.log("✅ Tokens unchanged from initial state - no comparison needed");
            }
            return;
        }

        // Run comparison if tokens have changed after initial setup
        const hasTokensChanged = currentHash !== lastTokensHashRef.current;

        if (hasTokensChanged) {
            console.log("🔄 Triggering comparison due to token changes...", {
                hasTokensChanged,
                metadataEnriched: isMetadataEnriched,
                oldHash: lastTokensHashRef.current,
                newHash: currentHash,
            });
            lastTokensHashRef.current = currentHash;
            performComparison();
        } else {
            console.log("✅ No comparison needed - tokens unchanged");
        }
    }, [identity, rawTokenList, isLoadingMetadata, isMetadataEnriched, initialTokenHash]);

    // Method to manually trigger comparison
    const triggerManualComparison = async (): Promise<void> => {
        console.log("🔧 Manually triggering token comparison...");
        await performComparison();
    };

    const contextValue: TokenAutoUpgradeContextType = {
        compareTokens,
        triggerManualComparison,
        lastComparisonResult: lastComparisonResultRef.current,
    };

    return (
        <TokenAutoUpgradeContext.Provider value={contextValue}>
            {children}
        </TokenAutoUpgradeContext.Provider>
    );
};
