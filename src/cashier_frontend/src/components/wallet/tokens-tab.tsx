import { WalletToken } from "./token-card";
import { Link } from "@/components/ui/link";
import { useTranslation } from "react-i18next";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { useWalletContext } from "@/contexts/wallet-context";

interface WalletTokensTab {
    tokens: FungibleToken[];
}

export function WalletTokensTab({ tokens }: WalletTokensTab) {
    const { t } = useTranslation();
    const { navigateToPanel } = useWalletContext();

    const handleManageClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigateToPanel("manage");
    };

    return (
        <div className="relative h-full w-full">
            <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col gap-4 py-4 pb-32">
                    {tokens.map((token) => (
                        <WalletToken key={token.id} token={token} />
                    ))}
                    <button
                        onClick={handleManageClick}
                        className="mx-auto font-normal whitespace-nowrap py-2 text-[#36A18B]"
                    >
                        + {t("wallet.tabs.tokens.manage")}
                    </button>
                </div>
            </div>
        </div>
    );
}
