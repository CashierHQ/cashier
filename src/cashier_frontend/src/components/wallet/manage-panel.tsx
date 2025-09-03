// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Search as SearchIcon,
  RefreshCw,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { ManageTokensList } from "@/components/manage-tokens/token-list";
import { ManageTokensMissingTokenMessage } from "@/components/manage-tokens/missing-token-message";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { IconInput } from "@/components/icon-input";
import { Search } from "lucide-react";
import { useWalletContext } from "@/contexts/wallet-context";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface ManagePanelProps {
  onBack: () => void;
}

const ManagePanel: React.FC<ManagePanelProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { navigateToPanel } = useWalletContext();

  const {
    rawTokenList,
    isLoading,
    updateTokenExplorer,
    isSyncPreferences,
    updateTokenBalance,
    sortedTokens,
    searchTokens,
    searchQuery,
    setSearchQuery,
  } = useTokensV2();

  const [isExplorerLoading, setIsExplorerLoading] = useState<boolean>(false);

  // For infinite scrolling
  const [displayLimit, setDisplayLimit] = useState<number>(30); // Initial load of 30 tokens
  const loaderRef = useRef<HTMLDivElement>(null);

  // Get the tokens to display based on display limit and search query
  const displayedTokens = useMemo(() => {
    const tokensToDisplay = searchQuery
      ? searchTokens(searchQuery)
      : sortedTokens;
    return tokensToDisplay.slice(0, displayLimit);
  }, [sortedTokens, searchQuery, searchTokens, displayLimit]);

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
            // Use the appropriate token list based on search query
            const currentTokenList = searchQuery
              ? searchTokens(searchQuery)
              : sortedTokens;
            // Don't exceed the total number of items
            return Math.min(newLimit, currentTokenList.length);
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
  }, [sortedTokens, searchQuery, searchTokens]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setDisplayLimit(30); // Reset display limit when clearing search
  };

  // Handle update with feedback
  const handleUpdateExplorer = useCallback(async () => {
    setIsExplorerLoading(true);
    try {
      console.log("Updating token explorer...");
      await updateTokenExplorer();
      console.log("Token data refresh complete");
    } catch (error) {
      console.error("Error updating token explorer", error);
    } finally {
      setIsExplorerLoading(false);
    }
  }, [updateTokenExplorer, updateTokenBalance]);

  // Reset display limit when search query changes
  useEffect(() => {
    setDisplayLimit(30);
  }, [searchQuery]);

  const isNoTokens = rawTokenList.length === 0;
  const currentTokenList = searchQuery
    ? searchTokens(searchQuery)
    : sortedTokens;
  const noSearchResults =
    !isNoTokens && searchQuery && currentTokenList.length === 0;
  const hasMoreTokens = displayLimit < currentTokenList.length;

  const handleImportToken = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateToPanel("import");
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="relative flex justify-center items-center mb-4">
        <button onClick={onBack} className="absolute left-0">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">{t("manage.header")}</h1>
      </div>

      <div className="mt-6 relative">
        <div className="w-full flex gap-1.5">
          <IconInput
            isCurrencyInput={false}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<SearchIcon color="#35A18A" />}
            placeholder="Search for a token"
            rightIcon={
              searchQuery && (
                <button className="text-[#35A18A] text-sm">Clear</button>
              )
            }
            onRightIconClick={handleClearSearch}
          />
          <button
            onClick={handleImportToken}
            className="light-borders flex items-center justify-center w-[44px] min-w-[44px] max-w-[44px] h-[44px] flex-shrink-0"
          >
            <Plus size={22} color="#35A18A" />
          </button>
          <button
            onClick={handleUpdateExplorer}
            className="light-borders flex items-center justify-center w-[44px] min-w-[44px] max-w-[44px] h-[44px] flex-shrink-0"
          >
            <RefreshCw
              size={22}
              color="#35A18A"
              style={isExplorerLoading ? halfSpinStyle : {}}
            />
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
            <div className="flex justify-center py-4 items-center">
              <Spinner width={40} height={40} />
              <span className="ml-2">{t("common.loading")}</span>
            </div>
          ) : isNoTokens ? (
            <ManageTokensMissingTokenMessage />
          ) : noSearchResults ? (
            <div className="flex flex-col items-center justify-center mt-16">
              <div className="w-12 h-12 rounded-xl bg-lightgreen flex items-center justify-center mb-4">
                <Search className="stroke-green" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("manage.search.noResults")}
              </h3>
              <p className="text-sm text-gray-500 text-center max-w-[250px] mb-4">
                {t("manage.search.missingToken")}
              </p>
              <button
                onClick={handleImportToken}
                className="text-green hover:text-green/90 font-medium"
              >
                + {t("manage.import")}
              </button>
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
      </div>
    </div>
  );
};

export default ManagePanel;
