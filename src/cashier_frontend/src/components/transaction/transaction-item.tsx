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
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";

interface TransactionItemProps {
    title: string;
    intent: IntentModel;
    isLoading?: boolean;
    isUsd?: boolean;
}

export const TransactionItem: FC<TransactionItemProps> = ({ intent, isLoading, isUsd }) => {
    const { t } = useTranslation();
    const {
        isLoadingMetadata,
        assetAmount,
        assetSymbol,
        assetSrc,
        feeAmount,
        feeSymbol,
        title: intentTitle,
    } = useIntentMetadata(intent);

    const getTokenPrice = useTokenStore((state) => state.getTokenPrice);
    const tokenUsdPrice = getTokenPrice(intent.asset.address);

    //TODO: Remove after mid milestone
    const getTokenAvatar = (tokenAddress: string) => {
        if (tokenAddress === "x5qut-viaaa-aaaar-qajda-cai") {
            return `${IC_EXPLORER_IMAGES_PATH}ryjl3-tyaaa-aaaaa-aaaba-cai`;
        } else if (tokenAddress === "k64dn-7aaaa-aaaam-qcdaq-cai") {
            return `${IC_EXPLORER_IMAGES_PATH}2ouva-viaaa-aaaaq-aaamq-cai`;
        } else return assetSrc;
    };

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
                    isLoading={isLoading || isLoadingMetadata}
                    amount={assetAmount}
                    usdAmount={convert(assetAmount, tokenUsdPrice)}
                    src={getTokenAvatar(intent.asset.address)}
                    symbol={assetSymbol}
                    isUsd={isUsd}
                />

                <Fee
                    title={t("transaction.confirm_popup.network_fee_label")}
                    isLoading={isLoading || isLoadingMetadata}
                    amount={feeAmount}
                    usdAmount={convert(feeAmount, tokenUsdPrice)}
                    symbol={feeSymbol}
                    isUsd={isUsd}
                />
            </div>
        </div>
    );
};
