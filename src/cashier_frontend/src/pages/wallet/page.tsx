import { WalletHero } from "@/components/wallet/hero";
import { WalletTabs } from "@/components/wallet/tabs";
import { MOCK_TOKENS_LIST, MOCK_TOTAL_USD_EQUIVALENT } from "@/constants/mock-data";

export default function WalletPage() {
    return (
        <div className="flex-grow overflow-auto">
            <WalletHero totalUsdEquivalent={MOCK_TOTAL_USD_EQUIVALENT} />
            <WalletTabs fungibleTokens={MOCK_TOKENS_LIST} />
        </div>
    );
}
