import { IntentModel } from "@/services/types/refractor.intent.service.types";
import { useEffect, useState } from "react";
import useTokenMetadataQuery from "./useTokenMetadataQuery";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { NETWORK_FEE_DEFAULT_SYMBOL } from "@/constants/defaultValues";
import { convertDecimalBigIntToNumber } from "@/utils";

export const useIntentMetadata = (intent: IntentModel) => {
    const { data: tokenData, isLoading: isLoadingMetadata } = useTokenMetadataQuery(
        intent.asset.address,
    );
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
        feeSymbol: NETWORK_FEE_DEFAULT_SYMBOL,
        feeIconSrc: undefined,
        isLoadingMetadata,
    };
};
