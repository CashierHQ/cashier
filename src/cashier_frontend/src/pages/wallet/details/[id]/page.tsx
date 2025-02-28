import { useNavigate } from "react-router-dom";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { BackHeader } from "@/components/ui/back-header";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionHistory } from "@/components/token-details/transaction-history";
import { Chain } from "@/services/types/link.service.types";
import { TransactionType } from "@/types/transaction-type";
import { TransactionRecord } from "@/types/transaction-record.speculative";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";

const MOCK_TX_DATA: TransactionRecord[] = [
    {
        id: "1",
        chain: Chain.IC,
        type: TransactionType.Send,
        from: { address: "my-wallet", chain: Chain.IC },
        to: { address: "other-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 1.5,
        usdEquivalent: 4500,
        createdAt: new Date("2024-02-25T12:00:00Z"),
    },
    {
        id: "2",
        chain: Chain.IC,
        type: TransactionType.Receive,
        from: { address: "other-wallet", chain: Chain.IC },
        to: { address: "my-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 60,
        usdEquivalent: 65.33,
        createdAt: new Date("2024-02-25T15:30:00Z"),
    },
    {
        id: "3",
        chain: Chain.IC,
        type: TransactionType.Send,
        from: { address: "my-wallet", chain: Chain.IC },
        to: { address: "other-wallet", chain: Chain.IC },
        asset: { address: "asset-address", chain: Chain.IC },
        amount: 0.1,
        usdEquivalent: 5000,
        createdAt: new Date("2024-02-26T09:45:00Z"),
    },
];

const MOCK_TOKEN_DATA: FungibleToken = {
    address: "73mez-iiaaa-aaaaq-aaasq-cai",
    chain: Chain.IC,
    name: "Kinic",
    symbol: "KINIC",
    logo: `${IC_EXPLORER_IMAGES_PATH}73mez-iiaaa-aaaaq-aaasq-cai`,
    decimals: 8,
    amount: 60,
    usdEquivalent: 65.33,
};

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
