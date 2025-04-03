import { useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search } from "@/components/ui/search";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { useResponsive } from "@/hooks/responsive-hook";
import { useIdentity } from "@nfid/identitykit/react";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { debounce } from "lodash";
import { useTokenStore } from "@/stores/tokenStore";

export default function ManageTokensPage() {
    const { t } = useTranslation();
    const responsive = useResponsive();

    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");

    const { tokens, searchTokens, isLoading } = useTokenStore();

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [displayedTokens, setDisplayedTokens] = useState<FungibleToken[]>(tokens);

    // Add debouncing to search
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            const results = query.trim() ? searchTokens(query) : tokens;
            setDisplayedTokens(results);
        }, 300),
        [searchTokens, tokens],
    );

    // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    // Update displayed tokens when tokens change
    useEffect(() => {
        if (searchQuery.trim()) {
            debouncedSearch(searchQuery);
        } else {
            setDisplayedTokens(tokens);
        }
    }, [tokens]);

    // Cancel debounce on unmount
    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const isNoTokens = tokens.length === 0;
    const noSearchResults = !isNoTokens && searchQuery && displayedTokens.length === 0;

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("manage.header")}</h1>
            </BackHeader>
            <Search.Root className="mt-6">
                <Search.Icon />
                <Search.Input
                    placeholder={t("manage.search.placeholder")}
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
                {searchQuery && (
                    <button
                        className="text-xs text-blue-500"
                        onClick={() => {
                            setSearchQuery("");
                            setDisplayedTokens(tokens);
                        }}
                    >
                        {t("common.clear")}
                    </button>
                )}
            </Search.Root>

            <div className="flex flex-col py-6">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <span>{t("common.loading")}</span>
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
