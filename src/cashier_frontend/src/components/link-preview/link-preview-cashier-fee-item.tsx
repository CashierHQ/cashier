// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FeeModel } from "@/services/types/intent.service.types";
import { FC } from "react";
import { Spinner } from "../ui/spinner";
import { Asset } from "../ui/asset";
import { useTranslation } from "react-i18next";
import { useFeeMetadata } from "@/hooks/useFeeMetadata";
import { useTokens } from "@/hooks/useTokens";

type LinkPreviewCashierFeeItemProps = {
    feeModel: FeeModel;
};

export const LinkPreviewCashierFeeItem: FC<LinkPreviewCashierFeeItemProps> = ({ feeModel }) => {
    const { t } = useTranslation();
    const { isLoadingMetadata, assetAmount, assetSrc } = useFeeMetadata(feeModel);

    const { getToken } = useTokens();
    const token = getToken(feeModel.address);

    return (
        <>
            {isLoadingMetadata ? (
                <Spinner width={22} />
            ) : (
                <Asset
                    token={token}
                    title={t("link.preview.fees.creationFee")}
                    amount={assetAmount}
                    src={assetSrc}
                />
            )}
        </>
    );
};
