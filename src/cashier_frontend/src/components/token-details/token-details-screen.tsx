import { AssetAvatar } from "../ui/asset-avatar";
import { BackHeader } from "../ui/back-header";
import { TokenDetailsHero } from "./token-details-hero";
import { TransactionList } from "./transaction-list";

export function TokenDetailsScreen() {
    return (
        <div className="h-full px-4 py-2">
            <BackHeader>
                <AssetAvatar className="w-8 h-8" />
            </BackHeader>

            <TokenDetailsHero />

            <TransactionList />
        </div>
    );
}
