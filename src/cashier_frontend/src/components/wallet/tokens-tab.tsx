// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { WalletToken } from "./token-card";
import { useTranslation } from "react-i18next";
import { useWalletContext } from "@/contexts/wallet-context";
import { useTokens } from "@/hooks/useTokens";
import { useTokenStore } from "@/stores/tokenStore";
import { useMemo } from "react";

export function WalletTokensTab() {
    const { t } = useTranslation();
    const { navigateToPanel } = useWalletContext();
    const tokenStore = useTokens();
    // Subscribe to rawTokenList and filters changes from the token store
    const { rawTokenList, filters } = useTokenStore();

    // Use useMemo to calculate and cache displayTokens based on dependencies
    const displayTokens = useMemo(() => {
        return tokenStore.getDisplayTokens();
    }, [tokenStore, rawTokenList, filters]);

    const handleManageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigateToPanel("manage");
    };

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
