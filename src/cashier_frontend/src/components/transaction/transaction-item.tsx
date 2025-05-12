import { FC } from "react";
import { IntentModel, FeeModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { useTranslation } from "react-i18next";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { convert } from "@/utils/helpers/convert";
import { Avatar } from "@radix-ui/react-avatar";
import { formatPrice } from "@/utils/helpers/currency";
import { AssetAvatarV2 } from "../ui/asset-avatar";
import { useTokens } from "@/hooks/useTokens";
import { useEffect, useState } from "react";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isLoading?: boolean;
    isUsd?: boolean;
    fees?: FeeModel[];
}

export const TransactionItem: FC<TransactionItemProps> = ({
    intent,
    isLoading,
    isUsd,
    fees = [],
}) => {
    const { t } = useTranslation();
    const { assetAmount, assetSymbol, title: intentTitle, assetSrc } = useIntentMetadata(intent);
    const [adjustedAmount, setAdjustedAmount] = useState<number | undefined>(assetAmount);

    const { getToken, getTokenPrice } = useTokens();
    const token = getToken(intent.asset.address);
    const tokenUsdPrice = getTokenPrice(intent.asset.address);

    // Calculate adjusted amount by subtracting fees
    useEffect(() => {
        if (assetAmount === undefined || !token) return;

        let totalFeeAmount = 0;

        // Sum up all fees for this token
        for (const fee of fees) {
            if (fee.address === intent.asset.address && token.decimals !== undefined) {
                totalFeeAmount += Number(fee.amount) / 10 ** token.decimals;
            }
        }

        // Subtract fees from asset amount
        const newAdjustedAmount = Math.max(0, assetAmount - totalFeeAmount);
        setAdjustedAmount(newAdjustedAmount);
    }, [assetAmount, fees, intent.asset.address, token]);

    return (
        <div className="flex items-center">
            {mapIntentsStateToStatus(intent.state) !== undefined && (
                <div className="mr-1.5">
                    <Status status={mapIntentsStateToStatus(intent.state)} />
                </div>
            )}

            <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5 rounded-full overflow-hidden">
                        <AssetAvatarV2 token={token} className="w-full h-full object-cover" />
                    </Avatar>
                    <p className="text-[14px] font-normal flex items-center gap-2">
                        {assetSymbol}
                        <span className="text-grey/60 text-[10px] font-normal">
                            {intentTitle.toLowerCase().includes("link creation fee")
                                ? "Link creation fee"
                                : ""}
                        </span>
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                        <p className="text-[14px] font-normal">
                            {formatPrice(adjustedAmount?.toString() || "0")}
                        </p>
                    </div>
                    <p className="text-[10px] font-normal text-grey/50">
                        {tokenUsdPrice && tokenUsdPrice > 0
                            ? `~${formatPrice((convert(adjustedAmount, tokenUsdPrice) || 0).toString())}`
                            : "No price available"}
                    </p>
                </div>
            </div>

            {/* <div className="flex flex-col w-full"> */}
            {/* <Asset
                    title={intentTitle}
                    isLoading={isLoading}
                    amount={assetAmount}
                    usdAmount={convert(assetAmount, tokenUsdPrice)}
                    src={assetSrc}
                    symbol={assetSymbol}
                    isUsd={isUsd}
                /> */}

            {/* <Fee
                    title={t("transaction.confirm_popup.network_fee_label")}
                    isLoading={isLoading}
                    amount={feeAmount}
                    usdAmount={convert(feeAmount, tokenUsdPrice)}
                    symbol={feeSymbol}
                    isUsd={isUsd}
                /> */}
            {/* </div> */}
        </div>
    );
};
