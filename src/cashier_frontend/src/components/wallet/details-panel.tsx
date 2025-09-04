// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMemo } from "react";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionHistory } from "@/components/token-details/transaction-history";
import { MOCK_TX_DATA } from "@/constants/mock-data"; // Still using mock transaction data
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTokensV2 } from "@/hooks/token/useTokensV2";

interface DetailsPanelProps {
  tokenId?: string;
  onBack: () => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ tokenId, onBack }) => {
  const { isLoadingBalances, displayTokens } = useTokensV2();

  // Find the selected token from the list
  const selectedToken = useMemo(() => {
    if (!tokenId || !displayTokens?.length) {
      return undefined;
    }

    return displayTokens.find((token) => token.address === tokenId);
  }, [tokenId, displayTokens, isLoadingBalances]);

  // Show loading state while token data is being fetched
  if (isLoadingBalances && !selectedToken) {
    return (
      <div className="w-full flex flex-col h-full">
        <div className="relative flex justify-center items-center mb-4">
          <button onClick={onBack} className="absolute left-0">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold">Token Details</h1>
        </div>

        <div id="content" className="h-full">
          <div className="flex items-center w-full justify-center mb-5">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="mb-5 h-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-60 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full">
      <div className="relative flex justify-center items-center mb-4">
        <button onClick={onBack} className="absolute left-0">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">
          {selectedToken?.symbol || "Token Details"}
        </h1>
      </div>

      <div id="content" className="h-full">
        {selectedToken ? (
          <>
            <div className="flex w-full justify-center mb-5">
              <AssetAvatarV2 token={selectedToken} className="w-12 h-12" />
            </div>
            <div className="mb-5">
              <TokenDetailsHero token={selectedToken} />
            </div>
            <div>
              <TransactionHistory items={MOCK_TX_DATA} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <h2 className="text-xl font-medium mb-2">Token Not Found</h2>
            <p className="text-gray-500 mb-6">
              The token you're looking for could not be found.
            </p>
            <Button variant="default" onClick={onBack}>
              Return to Wallet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;
