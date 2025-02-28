import { WalletHero } from "@/components/wallet/hero";
import { WalletTabs } from "@/components/wallet/tabs";

export default function WalletPage() {
    return (
        <div className="flex-grow overflow-auto">
            <WalletHero totalUsdEquivalent={42_475.1} />
            <WalletTabs />
        </div>
    );
}
