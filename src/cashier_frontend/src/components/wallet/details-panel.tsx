import { useMemo } from "react";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionHistory } from "@/components/token-details/transaction-history";
import { MOCK_TX_DATA } from "@/constants/mock-data"; // Still using mock transaction data
import { useTokens } from "@/hooks/useTokens";
import { useWalletContext } from "@/contexts/wallet-context";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface DetailsPanelProps {
    tokenId?: string;
    onBack: () => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ tokenId, onBack }) => {
    // Use the useTokens hook to get consistent token data
    const { isLoadingBalances, getDisplayTokens } = useTokens();
    const userTokens = getDisplayTokens();

    // Find the selected token from the list
    const selectedToken = useMemo(() => {
        if (!tokenId || !userTokens?.length) {
            return undefined;
        }

        return userTokens.find((token) => token.address === tokenId);
    }, [tokenId, userTokens, isLoadingBalances]);

    // Show loading state while token data is being fetched
    if (isLoadingBalances && !selectedToken) {
        return (
            <div className="w-full flex flex-col h-full">
                <div className="flex items-center mb-4">
                    <button onClick={onBack} className="mr-3">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="h-8 w-full"></div>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center w-full justify-center h-fit">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="mt-4 h-40 bg-gray-100 rounded-lg animate-pulse" />
                    <hr className="my-4" />
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

            {selectedToken ? (
                <div>
                    <div className="flex w-full justify-center h-fit items-center bg-transparent">
                        <AssetAvatar
                            className="w-12 h-12"
                            src={selectedToken.logo}
                            symbol={selectedToken.symbol}
                        />
                    </div>
                    <TokenDetailsHero token={selectedToken} />
                    <hr className="my-4" />
                    <TransactionHistory items={MOCK_TX_DATA} />
                </div>
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
    );
};

export default DetailsPanel;
