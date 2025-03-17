import { useNavigate, useParams } from "react-router-dom";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { BackHeader } from "@/components/ui/back-header";
import { TokenDetailsHero } from "@/components/token-details/hero";
import { TransactionHistory } from "@/components/token-details/transaction-history";
import { MOCK_TOKEN_DATA, MOCK_TOKENS_LIST, MOCK_TX_DATA } from "@/constants/mock-data";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";

export default function TokenDetailsPage() {
    const navigate = useNavigate();
    const goBack = () => navigate("/wallet");
    const { tokenId } = useParams<{ tokenId: string }>();
    const { metadata } = useTokenMetadata(tokenId);
    const { data: conversionRates, isLoading: isLoadingConversionRates } =
        useConversionRatesQuery(tokenId);

    //TODO: Still using mock token list data
    const getTokenData = (): FungibleToken | undefined => {
        const token = MOCK_TOKENS_LIST.find((t) => t.address === tokenId);
        if (token) {
            return {
                address: tokenId ?? "",
                chain: token.chain,
                name: metadata?.symbol || token.name,
                symbol: metadata?.symbol || token.symbol,
                logo: `${IC_EXPLORER_IMAGES_PATH}${tokenId}` || token.logo,
                decimals: metadata?.decimals || token.decimals,
                amount: token.amount,
                usdConversionRate: conversionRates?.tokenToUsd || token.usdConversionRate,
                usdEquivalent: conversionRates?.tokenToUsd || token.usdEquivalent,
            };
        }
        return undefined;
    };

    return (
        <div className="h-full overflow-auto px-4 py-2">
            <BackHeader onBack={goBack}>
                <AssetAvatar
                    className="w-10 h-10"
                    src={getTokenData()?.logo ?? MOCK_TOKEN_DATA.logo}
                    symbol={getTokenData()?.symbol ?? MOCK_TOKEN_DATA.symbol}
                />
            </BackHeader>

            <TokenDetailsHero token={getTokenData() ?? MOCK_TOKEN_DATA} />

            <hr className="my-4" />

            <TransactionHistory items={MOCK_TX_DATA} />
        </div>
    );
}
