import { FC } from "react";
import { IntentModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { Fee } from "@/components/ui/fee";
import { useTranslation } from "react-i18next";
import { Asset } from "@/components/ui/asset";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { useConversionRatesQuery } from "@/hooks/useConversionRatesQuery";
import { convert } from "@/utils/helpers/convert";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isLoading?: boolean;
    isUsd?: boolean;
}

export const TransactionItem: FC<TransactionItemProps> = ({ title, intent, isLoading, isUsd }) => {
    const { t } = useTranslation();
    const { isLoadingMetadata, assetAmount, assetSymbol, assetSrc, feeAmount, feeSymbol } =
        useIntentMetadata(intent);

    const { data: conversionRates } = useConversionRatesQuery(intent.asset.address);

    return (
        <div className="flex items-center">
            {mapIntentsStateToStatus(intent.state) !== undefined && (
                <div className="mr-1.5">
                    <Status status={mapIntentsStateToStatus(intent.state)} />
                </div>
            )}

            <div className="flex flex-col w-full">
                <Asset
                    title={title}
                    isLoading={isLoading || isLoadingMetadata}
                    amount={assetAmount}
                    usdAmount={convert(assetAmount, conversionRates?.tokenToUsd)}
                    src={assetSrc}
                    symbol={assetSymbol}
                    isUsd={isUsd}
                />

                <Fee
                    title={t("transaction.confirm_popup.network_fee_label")}
                    isLoading={isLoading || isLoadingMetadata}
                    amount={feeAmount}
                    usdAmount={convert(feeAmount, conversionRates?.tokenToUsd)}
                    symbol={feeSymbol}
                    isUsd={isUsd}
                />
            </div>
        </div>
    );
};
