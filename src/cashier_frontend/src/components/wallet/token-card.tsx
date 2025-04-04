import { prettyNumber } from "@/utils/helpers/number/pretty";
import { AssetAvatar } from "../ui/asset-avatar";
import { useNavigate } from "react-router-dom";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { convertDecimalBigIntToNumber } from "@/utils";

export interface WalletTokenProps {
    token: FungibleToken;
}

export function WalletToken({ token }: WalletTokenProps) {
    const navigate = useNavigate();

    const navigateToDetailsPage = () => navigate(`/wallet/details/${token.address}`);

    return (
        <article className="flex justify-between" onClick={navigateToDetailsPage}>
            <div className="flex flex-row items-center gap-2">
                <AssetAvatar src={token.logo} symbol={token.chain} className="w-9 h-9" />

                <div className="flex flex-col gap-1.5">
                    <span className="leading-4">{token.symbol}</span>

                    <span className="text-grey text-xs font-light leading-none">
                        {token.usdConversionRate === null
                            ? "-"
                            : `$${token.usdConversionRate.toFixed(6)}`}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-right leading-4">
                    {prettyNumber(convertDecimalBigIntToNumber(token.amount, token.decimals))}
                </span>

                <span className="text-grey font-light text-right text-xs leading-none">
                    {token.usdEquivalent === null ? "-" : `$${prettyNumber(token.usdEquivalent)}`}
                </span>
            </div>
        </article>
    );
}
