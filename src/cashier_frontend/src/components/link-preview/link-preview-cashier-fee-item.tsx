import { FeeModel } from "@/services/types/intent.service.types";
import { FC } from "react";
import { Spinner } from "../ui/spinner";
import { Asset } from "../ui/asset";
import { useTranslation } from "react-i18next";
import { useFeeMetadata } from "@/hooks/useFeeMetadata";

type LinkPreviewCashierFeeItemProps = {
    feeModel: FeeModel;
};

export const LinkPreviewCashierFeeItem: FC<LinkPreviewCashierFeeItemProps> = ({ feeModel }) => {
    const { t } = useTranslation();
    const { isLoadingMetadata, assetAmount, assetSrc, assetSymbol } = useFeeMetadata(feeModel);

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
