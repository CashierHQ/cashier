import { WalletHero } from "@/components/wallet/hero";
import { WalletTabs } from "@/components/wallet/tabs";
import { useResponsive } from "@/hooks/responsive-hook";
import { MOCK_TOKENS_LIST, MOCK_TOTAL_USD_EQUIVALENT } from "@/constants/mock-data";

export default function WalletPage() {
    const responsive = useResponsive();

    return (
        <div
            className={`flex flex-col h-dvh ${!responsive.isSmallDevice && "max-w-[700px] mx-auto bg-white max-h-[80%] mt-12 rounded-xl shadow-sm p-4"}`}
        >
            <div className="flex-none">
                <WalletHero totalUsdEquivalent={MOCK_TOTAL_USD_EQUIVALENT} />
            </div>
            <div className="flex-1 overflow-hidden">
                <WalletTabs fungibleTokens={MOCK_TOKENS_LIST} />
            </div>
        </div>
    );
}
