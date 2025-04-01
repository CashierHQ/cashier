import { WalletToken } from "./token-card";
import { Link } from "@/components/ui/link";
import { useTranslation } from "react-i18next";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface WalletTokensTab {
    tokens: FungibleToken[];
}

export function WalletTokensTab({ tokens }: WalletTokensTab) {
    const { t } = useTranslation();

    return (
        <div className="h-full overflow-y-auto flex flex-col gap-4 p-4">
            {tokens.map((token) => (
                <WalletToken key={token.address} token={token} />
            ))}
            <Link to="/wallet/manage" className="mx-auto font-normal whitespace-nowrap py-2">
                + {t("wallet.tabs.tokens.manage")}
            </Link>
        </div>
    );
}
