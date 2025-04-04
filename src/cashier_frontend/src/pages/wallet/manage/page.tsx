import { useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search } from "@/components/ui/search";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { useResponsive } from "@/hooks/responsive-hook";
import { useTokens } from "@/hooks/useTokens";

export default function ManageTokensPage() {
    const { t } = useTranslation();
    const responsive = useResponsive();

    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");

    const { tokens, isLoading } = useTokens();

    const [searchQuery, setSearchQuery] = useState<string>("");

    // Add debouncing to search
    // const debouncedSearch = useCallback(
    //     debounce((query: string) => {
    //         const results = query.trim() ? searchTokens(query) : tokens;
    //         setDisplayedTokens(results);
    //     }, 300),
    //     [searchTokens, tokens],
    // );

    // // Handle search input changes
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // const query = e.target.value;
        // setSearchQuery(query);
        // debouncedSearch(query);
    };

    useEffect(() => {
        // Reset search when tokens change
        console.log("Tokens changed:", tokens);
    }, [tokens]);

    const isNoTokens = tokens.length === 0;
    const noSearchResults = !isNoTokens && searchQuery && tokens.length === 0;

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
                    <ManageTokensList items={tokens} />
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
