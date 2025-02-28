import { useNavigate } from "react-router-dom";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { BackHeader } from "@/components/ui/back-header";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionHistory } from "@/components/token-details/transaction-history";
import { MOCK_TOKEN_DATA, MOCK_TX_DATA } from "@/constants/mock-data";

export default function TokenDetailsPage() {
    const navigate = useNavigate();

    const goBack = () => navigate("/wallet");

    return (
        <div className="h-full overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                <AssetAvatar
                    className="w-8 h-8"
                    src={MOCK_TOKEN_DATA.logo}
                    symbol={MOCK_TOKEN_DATA.symbol}
                />
            </BackHeader>

            <TokenDetailsHero token={MOCK_TOKEN_DATA} />

            <hr className="my-4" />

            <TransactionHistory items={MOCK_TX_DATA} />
        </div>
    );
}
