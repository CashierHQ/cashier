import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { BackHeader } from "@/components/ui/back-header";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionHistory } from "@/components/token-details/transaction-history";
import { MOCK_TX_DATA } from "@/constants/mock-data"; // Still using mock transaction data
import { useTokens } from "@/hooks/useTokens";

export default function TokenDetailsPage() {
    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");
    const { tokenId } = useParams<{ tokenId: string }>();

    // Use the useTokens hook to get consistent token data
    const { isLoadingBalances, getDisplayTokens } = useTokens();
    const userTokens = getDisplayTokens();

    // Find the selected token from the list
    const selectedToken = useMemo(() => {
        if (!tokenId || isLoadingBalances || !userTokens?.length) {
            return undefined;
        }

        return userTokens.find((token) => token.address === tokenId);
    }, [tokenId, userTokens, isLoadingBalances]);

    // Show loading state while token data is being fetched
    if (isLoadingBalances) {
        return (
            <div className="h-full overflow-auto px-4 py-2">
                <BackHeader onBack={goBack}>
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                </BackHeader>
                <div className="mt-4 h-40 bg-gray-100 rounded-lg animate-pulse" />
                <hr className="my-4" />
                <div className="h-60 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                {selectedToken && (
                    <AssetAvatar
                        className="w-10 h-10"
                        src={selectedToken.logo}
                        symbol={selectedToken.symbol}
                    />
                )}
            </BackHeader>

            {selectedToken ? (
                <>
                    <TokenDetailsHero token={selectedToken} />
                    <hr className="my-4" />
                    <TransactionHistory items={MOCK_TX_DATA} />
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <h2 className="text-xl font-medium mb-2">Token Not Found</h2>
                    <p className="text-gray-500 mb-6">
                        The token you're looking for could not be found.
                    </p>
                    <button className="px-4 py-2 bg-primary text-white rounded-lg" onClick={goBack}>
                        Return to Wallet
                    </button>
                </div>
            )}
        </div>
    );
}
