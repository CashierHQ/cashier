import { prettyNumber } from "@/utils/helpers/number/pretty";
import { AssetAvatar } from "../ui/asset-avatar";
import { useNavigate } from "react-router-dom";
import { FungibleToken } from "@/types/fungible-token.speculative";

export interface WalletTokenProps {
    token: FungibleToken;
}

export function WalletToken({ token }: WalletTokenProps) {
    const navigate = useNavigate();

    const navigateToDetailsPage = () => navigate("/wallet/details/mock-details-page");

    return (
        <article className="flex justify-between" onClick={navigateToDetailsPage}>
            <div className="flex flex-row items-center gap-2 ">
                <AssetAvatar src={token.logo} symbol={token.symbol} className="w-9 h-9" />

                <div className="flex flex-col gap-1.5">
                    <span className="leading-4">{token.symbol}</span>

                    <span className="text-grey text-xs leading-none">
                        {token.usdConversionRate === null
                            ? "-"
                            : `$${prettyNumber(token.usdConversionRate)}`}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-right leading-4">{prettyNumber(token.amount)}</span>

                <span className="text-grey text-right text-xs leading-none">
                    {token.usdEquivalent === null ? "-" : `$${prettyNumber(token.usdEquivalent)}`}
                </span>
            </div>
        </article>
    );
}
