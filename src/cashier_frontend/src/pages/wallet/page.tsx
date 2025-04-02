import { WalletHero } from "@/components/wallet/hero";
import { WalletTabs } from "@/components/wallet/tabs";
import { useResponsive } from "@/hooks/responsive-hook";
import { useTokenStore } from "@/stores/tokenStore";
import { useMemo, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIdentity } from "@nfid/identitykit/react";

export default function WalletPage() {
    const responsive = useResponsive();
    const identity = useIdentity();

    // Use the combined token store directly
    const {
        getDisplayTokens,
        rawDefaultTokenList,
        rawTokenList,
        updateTokenListInit,
        updateTokenBalanceAmountAll,
        isLoading,
    } = useTokenStore();

    // Initialize tokens when component mounts
    useEffect(() => {
        const initTokens = async () => {
            if (identity) {
                await updateTokenListInit(identity);
                await updateTokenBalanceAmountAll(identity);
            }
        };

        initTokens();
    }, [identity]);

    // Get the filtered tokens
    const filteredTokens = useMemo(() => {
        const tokens = getDisplayTokens();
        return tokens;
    }, [getDisplayTokens, rawDefaultTokenList, rawTokenList]);

    // Calculate the total USD equivalent from the tokens
    const totalUsdEquivalent = useMemo(() => {
        if (!filteredTokens || filteredTokens.length === 0) return 0;

        return filteredTokens.reduce((total, token) => {
            return total + (token.usdEquivalent || 0);
        }, 0);
    }, [filteredTokens]);

    // Show loading skeleton when tokens are loading
    if (isLoading) {
        return (
            <div
                className={`flex flex-col h-full ${!responsive.isSmallDevice && "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
            >
                <div className="flex-none">
                    <div className="p-4">
                        <Skeleton className="h-8 w-[150px] mb-2" />
                        <Skeleton className="h-12 w-[180px]" />
                    </div>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                    <Skeleton className="h-10 w-full mb-4" />
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <Skeleton className="h-9 w-9 rounded-full mr-2" />
                                <div>
                                    <Skeleton className="h-4 w-[100px] mb-2" />
                                    <Skeleton className="h-3 w-[70px]" />
                                </div>
                            </div>
                            <div>
                                <Skeleton className="h-4 w-[80px] mb-2" />
                                <Skeleton className="h-3 w-[60px]" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col h-full ${!responsive.isSmallDevice && "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
            <div className="flex-none">
                <WalletHero totalUsdEquivalent={totalUsdEquivalent} />
            </div>
            <div className="flex-1 overflow-hidden">
                <WalletTabs fungibleTokens={filteredTokens} />
            </div>
        </div>
    );
}
