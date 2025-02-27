import { prettyNumber } from "@/utils/helpers/number";
import { AssetAvatar } from "../ui/asset-avatar";
import { useNavigate } from "react-router-dom";

export interface WalletTokenProps {
    symbol: string;
    icon?: string;
    usdPerUnit?: number;
    availableAmount: number;
    availableUsdEquivalent?: number;
}

export function WalletToken({
    symbol,
    icon,
    usdPerUnit,
    availableAmount,
    availableUsdEquivalent,
}: WalletTokenProps) {
    const navigate = useNavigate();

    const navigateToDetailsPage = () => navigate("/wallet/details/mock-details-page");

    return (
        <article className="flex justify-between" onClick={navigateToDetailsPage}>
            <div className="flex flex-row items-center gap-2 ">
                <AssetAvatar src={icon} symbol={symbol} className="w-9 h-9" />

                <div className="flex flex-col gap-1.5">
                    <span className="leading-4">{symbol}</span>

                    {usdPerUnit !== undefined && (
                        <span className="text-grey text-xs leading-none">
                            ${prettyNumber(usdPerUnit)}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-right leading-4">{prettyNumber(availableAmount)}</span>

                {availableUsdEquivalent && (
                    <span className="text-grey text-right text-xs leading-none">
                        ${prettyNumber(availableUsdEquivalent)}
                    </span>
                )}
            </div>
        </article>
    );
}
