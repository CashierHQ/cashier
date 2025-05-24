// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { WalletToken } from "./token-card";
import { useTranslation } from "react-i18next";
import { useWalletContext } from "@/contexts/wallet-context";
import { useTokens } from "@/hooks/useTokens";
import { useTokenStore } from "@/stores/tokenStore";
import { useEffect, useState } from "react";
import { FungibleToken } from "@/types/fungible-token.speculative";

export function WalletTokensTab() {
    const { t } = useTranslation();
    const { navigateToPanel } = useWalletContext();
    const tokenStore = useTokens();
    // Add state to hold the display tokens
    const [displayTokens, setDisplayTokens] = useState<FungibleToken[]>([]);
    // Add state for refresh operation
    const [isRefreshing, setIsRefreshing] = useState(false);
    // Subscribe to rawTokenList and filters changes from the token store
    const { rawTokenList, filters, refetchData, isLoadingBalances, isLoadingPrices } =
        useTokenStore();

    // Refresh token data when component mounts
    useEffect(() => {
        // Refresh all token data when this component mounts
        refetchData?.();
    }, [refetchData]);

    // Update display tokens whenever rawTokenList or filters change
    useEffect(() => {
        const tokens = tokenStore.getDisplayTokens();
        setDisplayTokens(tokens);
    }, [tokenStore, rawTokenList, filters]);

    // Handle manual refresh
    const handleRefresh = async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        try {
            await refetchData?.();
        } finally {
            // Reset refresh state after a short delay to show feedback to the user
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    const handleManageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigateToPanel("manage");
    };

    const isLoading = isRefreshing || isLoadingBalances || isLoadingPrices;

    return (
        <div className="relative h-full w-full">
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col gap-4 py-4 pb-32">
                    {/* TODO: Might need in future, just disable it for now */}
                    {/* <div className="flex justify-end px-4">
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={`text-sm flex items-center ${isLoading ? "opacity-50" : ""}`}
                        >
                            <svg
                                className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                ></path>
                            </svg>
                            {isLoading
                                ? t("wallet.tabs.tokens.refreshing")
                                : t("wallet.tabs.tokens.refresh")}
                        </button>
                    </div> */}

                    {/* Token list */}
                    {displayTokens.map((token) => (
                        <WalletToken key={token.id} token={token} />
                    ))}

                    <button
                        onClick={handleManageClick}
                        className="mx-auto font-normal whitespace-nowrap py-2 text-[#36A18B]"
                    >
                        + {t("wallet.tabs.tokens.manage")}
                    </button>
                </div>
            </div>
        </div>
    );
}
