import { FC } from "react";
import { IntentModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { useTranslation } from "react-i18next";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { useTokenStore } from "@/stores/tokenStore";
import { convert } from "@/utils/helpers/convert";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { ICP_LOGO } from "@/const";
import { formatPrice } from "@/utils/helpers/currency";
import { AssetAvatar } from "../ui/asset-avatar";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isLoading?: boolean;
    isUsd?: boolean;
}

export const TransactionItem: FC<TransactionItemProps> = ({ intent, isLoading, isUsd }) => {
    const { t } = useTranslation();
    const {
        assetAmount,
        assetSymbol,
        feeAmount,
        feeSymbol,
        title: intentTitle,
        assetSrc,
    } = useIntentMetadata(intent);

    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const tokenUsdPrice = getTokenPrice(intent.asset.address);

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
                        <AssetAvatar
                            src={assetSrc || ICP_LOGO}
                            symbol={assetSymbol}
                            className="w-full h-full object-cover"
                        />
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
                            {formatPrice(assetAmount?.toString() || "0")}
                        </p>
                    </div>
                    <p className="text-[10px] font-normal text-grey/50">
                        ~${formatPrice((convert(assetAmount, tokenUsdPrice) || 0).toString())}
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
