import { useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search } from "@/components/ui/search";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { Link } from "@/components/ui/link";
import { useResponsive } from "@/hooks/responsive-hook";
import { useTokens } from "@/hooks/useTokens";
import { Spinner } from "@/components/ui/spinner";
import { FungibleToken } from "@/types/fungible-token.speculative";
import debounce from "lodash/debounce";

export default function ManageTokensPage() {
    const { t } = useTranslation();
    const responsive = useResponsive();

    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");

    const { tokens, isLoading, isSyncPreferences } = useTokens();

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filteredTokens, setFilteredTokens] = useState<FungibleToken[]>([]);

    // Search function to filter tokens
    const searchTokens = useCallback((query: string, tokenList: FungibleToken[]) => {
        if (!query.trim()) return tokenList;

        const lowercaseQuery = query.toLowerCase().trim();
        return tokenList.filter(
            (token) =>
                token.name.toLowerCase().includes(lowercaseQuery) ||
                token.symbol.toLowerCase().includes(lowercaseQuery) ||
                token.address.toLowerCase().includes(lowercaseQuery),
        );
    }, []);

    // Add debouncing to search
    const debouncedSearch = useCallback(
        debounce((query: string, tokenList: FungibleToken[]) => {
            const results = searchTokens(query, tokenList);
            setFilteredTokens(results);
        }, 300),
        [searchTokens],
    );

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query, tokens);
    };

    // Clear search
    const handleClearSearch = () => {
        setSearchQuery("");
        setFilteredTokens(tokens);
    };

    // Update filtered tokens when tokens list changes
    useEffect(() => {
        if (searchQuery) {
            debouncedSearch(searchQuery, tokens);
        } else {
            setFilteredTokens(tokens);
        }
    }, [tokens, debouncedSearch, searchQuery]);

    const displayedTokens = searchQuery ? filteredTokens : tokens;
    const isNoTokens = tokens.length === 0;
    const noSearchResults = !isNoTokens && searchQuery && filteredTokens.length === 0;

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("manage.header")}</h1>
            </BackHeader>

            <div className="mt-6 relative">
                {/* Search container with border */}
                <div className="w-full flex items-center rounded-lg border border-gray-300 focus-within:border-green">
                    {/* Search icon */}
                    <div className="ml-3">
                        <Search.Icon />
                    </div>

                    {/* Input field */}
                    <input
                        className="ml-6 flex-1 py-2 px-3 outline-none bg-transparent text-sm"
                        placeholder={t("manage.search.placeholder")}
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />

                    {/* Clear button */}
                    {searchQuery && (
                        <button className="text-sm text-blue-500 mr-3" onClick={handleClearSearch}>
                            {t("common.clear")}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col py-6 relative">
                {/* Loading Overlay for Sync Preferences */}
                {isSyncPreferences && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center rounded-md">
                        <div className="flex flex-col items-center">
                            <Spinner width={40} height={40} />
                            <p className="mt-4 text-gray-700">
                                {t("manage.syncingPreferences", "Syncing preferences...")}
                            </p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Spinner width={40} height={40} />
                        <span className="ml-2">{t("common.loading")}</span>
                    </div>
                ) : isNoTokens ? (
                    <ManageTokensMissingTokenMessage />
                ) : noSearchResults ? (
                    <div className="text-center py-4">
                        <p>{t("manage.search.noResults")}</p>
                    </div>
                ) : (
                    <ManageTokensList items={displayedTokens} />
                )}

                <div className="flex justify-center gap-4 mt-4">
                    <Link to="/wallet/import" className="text-blue-500">
                        + {t("manage.import")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
