import { useNavigate } from "react-router-dom";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { BackHeader } from "@/components/ui/back-header";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionList } from "@/components/token-details/transaction-list";

export default function TokenDetailsPage() {
    const navigate = useNavigate();

    const goBack = () => navigate("/wallet");

    return (
        <div className="h-full px-4 py-2">
            <BackHeader onBack={goBack}>
                <AssetAvatar className="w-8 h-8" />
            </BackHeader>

            <TokenDetailsHero />

            <hr className="my-4" />

            <TransactionList />
        </div>
    );
}
