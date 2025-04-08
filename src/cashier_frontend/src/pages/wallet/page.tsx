import { WalletHero } from "@/components/wallet/hero";
import { WalletTabs } from "@/components/wallet/tabs";
import { useResponsive } from "@/hooks/responsive-hook";
import { MOCK_TOKENS_LIST, MOCK_TOTAL_USD_EQUIVALENT } from "@/constants/mock-data";

export default function WalletPage() {
    const responsive = useResponsive();

    return (
        <div className={`flex flex-col ${responsive.isSmallDevice ? "py-4" : "px-4 h-full"}`}>
            <div className="flex-none w-full">
                <WalletHero totalUsdEquivalent={MOCK_TOTAL_USD_EQUIVALENT} />
            </div>
            <div className="flex-1 overflow-hidden w-full">
                <WalletTabs fungibleTokens={MOCK_TOKENS_LIST} />
            </div>
        </div>
    );
}
