import { IntentModel } from "@/services/types/refractor.intent.service.types";
import { FC } from "react";
import { Spinner } from "../ui/spinner";
import { Asset } from "../ui/asset";
import { useIntentMetadata } from "@/hooks/useIntentMetadata";
import { useTranslation } from "react-i18next";

type LinkPreviewCashierFeeItemProps = {
    intent: IntentModel;
};

export const LinkPreviewCashierFeeItem: FC<LinkPreviewCashierFeeItemProps> = ({ intent }) => {
    const { t } = useTranslation();
    const { isLoadingMetadata, assetAmount, assetSrc, assetSymbol } = useIntentMetadata(intent);

    return (
        <>
            {isLoadingMetadata ? (
                <Spinner />
            ) : (
                <Asset
                    title={t("link.preview.fees.creationFee")}
                    amount={assetAmount}
                    src={assetSrc}
                    symbol={assetSymbol}
                />
            )}
        </>
    );
};
