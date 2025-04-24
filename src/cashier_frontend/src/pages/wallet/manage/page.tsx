import { useNavigate } from "react-router-dom";
import { BackHeader } from "@/components/ui/back-header";
import { Search as SearchIcon, RefreshCw } from "lucide-react";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "@/components/ui/link";
import { useResponsive } from "@/hooks/responsive-hook";
import { useTokens } from "@/hooks/useTokens";
import { Spinner } from "@/components/ui/spinner";
import { IconInput } from "@/components/icon-input";

export default function ManageTokensPage() {
    const { t } = useTranslation();
    const responsive = useResponsive();

    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");

    const { rawTokenList, isLoading, updateTokenExplorer, isSyncPreferences, updateTokenBalance } =
        useTokens();

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isExplorerLoading, setIsExplorerLoading] = useState<boolean>(false);

    // For infinite scrolling
    const [displayLimit, setDisplayLimit] = useState<number>(30); // Initial load of 30 tokens
    const loaderRef = useRef<HTMLDivElement>(null);

    // Use either user tokens or raw tokens based on authentication status
    const tokens = rawTokenList;

    // Sort tokens by enabled status
    const sortedTokens = useMemo(() => {
        return [...tokens].sort((a, b) => {
            // If both have the same 'enabled' status, maintain original order
            if ((a.enabled ?? true) === (b.enabled ?? true)) {
                return 0;
            }
            // Enabled tokens come first (true > false)
            return (a.enabled ?? true) ? -1 : 1;
        });
    }, [tokens]);

    // Search function to filter tokens - moved inside useMemo
    const filteredTokens = useMemo(() => {
        const lcQuery = searchQuery.toLowerCase().trim();
        if (!lcQuery) return sortedTokens;

        return sortedTokens.filter(
            (token) =>
                token.name.toLowerCase().includes(lcQuery) ||
                token.symbol.toLowerCase().includes(lcQuery),
        );
    }, [searchQuery, sortedTokens]);

    // Custom animation style
    const halfSpinStyle = {
        animation: "half-spin-pause 2.3s infinite",
    };

    // Define CSS keyframes animation style
    const keyframesStyle = `
        @keyframes half-spin-pause {
            0% { transform: rotate(0deg); }
            40% { transform: rotate(180deg); }
            58% { transform: rotate(180deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    // Add the keyframes to the document on component mount
    useEffect(() => {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = keyframesStyle;
        document.head.appendChild(styleElement);

        return () => {
            document.head.removeChild(styleElement);
        };
    }, [keyframesStyle]);

    // Set up intersection observer for infinite scrolling
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0];
                if (target.isIntersecting) {
                    // When the loader comes into view, increase the display limit
                    setDisplayLimit((prev) => {
                        const newLimit = prev + 20; // Load 20 more items
                        // Don't exceed the total number of items
                        return Math.min(newLimit, filteredTokens.length);
                    });
                }
            },
            { threshold: 0.1 },
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [filteredTokens]);

    // Clear search
    const handleClearSearch = () => {
        setSearchQuery("");
        setDisplayLimit(30); // Reset display limit when clearing search
    };

    const handleUpdateExplorer = async () => {
        setIsExplorerLoading(true);
        try {
            await updateTokenExplorer();
            await updateTokenBalance();
        } catch (error) {
            console.error("Error updating token explorer", error);
        } finally {
            setIsExplorerLoading(false);
        }
    };

    // Reset display limit when search query changes
    useEffect(() => {
        setDisplayLimit(30);
    }, [searchQuery]);

    // Get the tokens to display based on display limit
    const displayedTokens = useMemo(() => {
        return filteredTokens.slice(0, displayLimit);
    }, [filteredTokens, displayLimit]);

    const isNoTokens = tokens.length === 0;
    const noSearchResults = !isNoTokens && searchQuery && filteredTokens.length === 0;
    const hasMoreTokens = displayLimit < filteredTokens.length;

    return (
        <div
            className={`flex flex-col ${responsive.isSmallDevice ? "px-2 py-4 h-full" : "max-w-[700px] mx-auto bg-white max-h-[80%] p-4"}`}
        >
            <BackHeader onBack={goBack}>
                <h1 className="text-lg font-semibold">{t("manage.header")}</h1>
            </BackHeader>

            <div className="mt-6 relative">
                <div className="w-full flex gap-2">
                    <IconInput
                        isCurrencyInput={false}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<SearchIcon color="#35A18A" />}
                        placeholder="Search for a token"
                        rightIcon={
                            searchQuery && <button className="text-[#35A18A] text-sm">Clear</button>
                        }
                        onRightIconClick={handleClearSearch}
                    />
                    <button
                        onClick={handleUpdateExplorer}
                        className="light-borders w-12 flex items-center justify-center"
                    >
                        <RefreshCw color="#35A18A" style={isExplorerLoading ? halfSpinStyle : {}} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col py-6 relative flex-1 overflow-hidden">
                {/* Container for scrollable content */}
                <div className="overflow-y-auto h-full pb-4 flex-1">
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
                        <div className="flex flex-col items-center justify-center mt-8">
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                                        stroke="#9CA3AF"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M21 21L16.65 16.65"
                                        stroke="#9CA3AF"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <p className="text-gray-700 font-medium">
                                {t("manage.search.missingToken", "Missing a token?")}
                            </p>
                        </div>
                    ) : (
                        <>
                            <ManageTokensList items={displayedTokens} />
                            {/* Invisible loader element for intersection observer */}
                            {hasMoreTokens && (
                                <div
                                    ref={loaderRef}
                                    className="mt-4 py-2 text-center text-gray-400 text-sm"
                                >
                                    <Spinner width={20} height={20} />
                                    <span className="ml-2">Loading more tokens...</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="flex justify-center gap-4 mt-4">
                    <Link
                        to="/wallet/import"
                        className="mx-auto font-normal whitespace-nowrap py-2"
                    >
                        + {t("manage.import")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
