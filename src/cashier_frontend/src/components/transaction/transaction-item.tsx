import { FC } from "react";
import { IntentModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { Fee } from "@/components/ui/fee";
import { useTranslation } from "react-i18next";
import { Asset } from "@/components/ui/asset";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { useTokenStore } from "@/stores/tokenStore";
import { convert } from "@/utils/helpers/convert";

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

            <div className="flex flex-col w-full">
                <Asset
                    title={intentTitle}
                    isLoading={isLoading}
                    amount={assetAmount}
                    usdAmount={convert(assetAmount, tokenUsdPrice)}
                    src={assetSrc}
                    symbol={assetSymbol}
                    isUsd={isUsd}
                />

                <Fee
                    title={t("transaction.confirm_popup.network_fee_label")}
                    isLoading={isLoading}
                    amount={feeAmount}
                    usdAmount={convert(feeAmount, tokenUsdPrice)}
                    symbol={feeSymbol}
                    isUsd={isUsd}
                />
            </div>
        </div>
    );
};
