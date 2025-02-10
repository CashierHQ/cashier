import { FC } from "react";
import { IntentModel } from "@/services/types/intent.service.types";
import { Status } from "@/components/ui/status";
import { mapIntentsStateToStatus } from "@/utils/map/status.map";
import { Fee } from "@/components/ui/fee";
import { useTranslation } from "react-i18next";
import { Asset } from "@/components/ui/asset";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isLoading?: boolean;
}

export const TransactionItem: FC<TransactionItemProps> = ({ title, intent, isLoading }) => {
    const { t } = useTranslation();
    const { isLoadingMetadata, assetAmount, assetSymbol, assetSrc, feeAmount, feeSymbol } =
        useIntentMetadata(intent);

    return (
        <div className="flex items-center">
            <div className="mr-1.5">
                <Status status={mapIntentsStateToStatus(intent.state)} />
            </div>

            <div className="flex flex-col w-full">
                <Asset
                    title={title}
                    isLoading={isLoading || isLoadingMetadata}
                    amount={assetAmount}
                    src={assetSrc}
                    symbol={assetSymbol}
                />

                <Fee
                    title={t("transaction.confirm_popup.network_fee_label")}
                    isLoading={isLoading || isLoadingMetadata}
                    amount={feeAmount}
                    symbol={feeSymbol}
                />
            </div>
        </div>
    );
};
