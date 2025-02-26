import { useNavigate } from "react-router-dom";
import { AssetAvatar } from "../ui/asset-avatar";
import { BackHeader } from "../ui/back-header";
import { TokenDetailsHero } from "./token-details-hero";
import { TransactionList } from "./transaction-list";

export function TokenDetailsScreen() {
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
