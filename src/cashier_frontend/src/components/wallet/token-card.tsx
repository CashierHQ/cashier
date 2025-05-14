import { prettyNumber } from "@/utils/helpers/number/pretty";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { useNavigate } from "react-router-dom";
import { FungibleToken } from "@/types/fungible-token.speculative";
import { convertDecimalBigIntToNumber } from "@/utils";
import { formatNumber } from "@/utils/helpers/currency";
import { useWalletContext } from "@/contexts/wallet-context";

export interface WalletTokenProps {
    token: FungibleToken;
}

export function WalletToken({ token }: WalletTokenProps) {
    const navigate = useNavigate();
    const { navigateToPanel } = useWalletContext();

    // When clicking on a token, either navigate to details page or details panel
    const handleTokenClick = () => {
        // Check if we're in a panel context (using a heuristic)
        const isInPanel =
            window.location.hash === "#/" || !window.location.hash.includes("/wallet/");

        if (isInPanel) {
            // We're in a panel, show details in the panel
            navigateToPanel("details", { tokenId: token.address });
        } else {
            // We're on a main wallet page, navigate to the full details page
            navigate(`/wallet/details/${token.address}`);
        }
    };

    return (
        <article className="flex justify-between" onClick={handleTokenClick}>
            <div className="flex flex-row items-center gap-2">
                <AssetAvatarV2 token={token} className="w-9 h-9" />

                <div className="flex flex-col gap-1.5">
                    <span className="leading-4">{token.symbol}</span>

                    {token.usdConversionRate ? (
                        <span className="flex flex-row items-center text-grey-400 text-xs font-light leading-none">
                            ${formatNumber(token.usdConversionRate.toString())}
                        </span>
                    ) : (
                        <span className="text-grey-400 text-xs font-light leading-none">-</span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-right leading-4">
                    {token.amount === null
                        ? "-"
                        : `${
                              token.amount
                                  ? prettyNumber(
                                        convertDecimalBigIntToNumber(token.amount, token.decimals),
                                    )
                                  : "0"
                          }`}
                </span>

                {token.usdEquivalent ? (
                    <span className="flex flex-row items-center justify-end text-grey-400 text-xs font-light leading-none">
                        ${formatNumber(token.usdEquivalent.toString())}
                    </span>
                ) : (
                    <span className="text-right text-grey-400 text-xs font-light leading-none">
                        -
                    </span>
                )}
            </div>
        </article>
    );
}
