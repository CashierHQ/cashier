import { IntentModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import useTokenMetadataQuery from "./useTokenMetadataQuery";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { TASK } from "@/services/types/enum";
import { useTranslation } from "react-i18next";

const getIntentTitle = (intent: IntentModel, t: (key: string) => string) => {
    switch (intent.task) {
        case TASK.TRANSFER_WALLET_TO_LINK:
            return t("transaction.confirm_popup.asset_label");
        case TASK.TRANSFER_WALLET_TO_TREASURY:
            return t("transaction.confirm_popup.link_creation_fee_label");
        case TASK.TRANSFER_LINK_TO_WALLET:
            return t("transaction.confirm_popup.asset_claim_label");
    }
};

export const useIntentMetadata = (intent: IntentModel) => {
    const { data: tokenData, isLoading: isLoadingMetadata } = useTokenMetadataQuery(
        intent.asset.address,
    );
    const { t } = useTranslation();

    const metadata = tokenData?.metadata;

    const [assetAmount, setAssetAmount] = useState<number>();
    const [feeAmount, setFeeAmount] = useState<number>();

    useEffect(() => {
        if (metadata) {
            const decimals = metadata.decimals;

            const rawAmount = intent.amount;
            setAssetAmount(convertDecimalBigIntToNumber(rawAmount, decimals));

            const rawFee = metadata?.fee;
            setFeeAmount(convertDecimalBigIntToNumber(rawFee, decimals));
        }
    }, [metadata]);

    return {
        assetAmount,
        assetSymbol: metadata?.symbol,
        assetSrc: `${IC_EXPLORER_IMAGES_PATH}${intent.asset.address}`,
        feeAmount,
        feeSymbol: metadata?.symbol,
        feeIconSrc: `${IC_EXPLORER_IMAGES_PATH}${intent.asset.address}`,
        title: getIntentTitle(intent, t),
        isLoadingMetadata,
    };
};
