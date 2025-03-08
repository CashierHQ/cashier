import { FeeModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import useTokenMetadataQuery from "./useTokenMetadataQuery";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { convertDecimalBigIntToNumber } from "@/utils";
import { IntentHelperService } from "@/services/fee.service";

export const useFeeMetadata = (feeModel: FeeModel) => {
    const { data: tokenData, isLoading: isLoadingMetadata } = useTokenMetadataQuery(
        feeModel.address,
    );
    const metadata = tokenData?.metadata;

    const [assetAmount, setAssetAmount] = useState<number>();
    const [feeAmount, setFeeAmount] = useState<number>();

    useEffect(() => {
        if (metadata) {
            const decimals = metadata.decimals;

            const rawAmount = feeModel.amount;
            setAssetAmount(convertDecimalBigIntToNumber(rawAmount, decimals));

            const rawFee = metadata?.fee;
            setFeeAmount(convertDecimalBigIntToNumber(rawFee, decimals));
        }
    }, [metadata]);

    return {
        assetAmount,
        assetSymbol: metadata?.symbol,
        assetSrc: `${IC_EXPLORER_IMAGES_PATH}${feeModel.address}`,
        feeAmount,
        feeSymbol: metadata?.symbol,
        feeIconSrc: `${IC_EXPLORER_IMAGES_PATH}${feeModel.address}`,
        isLoadingMetadata,
    };
};

export const useFeeTotal = (feeModels: FeeModel[]) => {
    const [total, setTotal] = useState<number>();

    useEffect(() => {
        const initState = async () => {
            const totalCashierFee = await IntentHelperService.calculateFeeTotal(feeModels);
            setTotal(totalCashierFee);
        };

        initState();
    }, [feeModels]);

    return total;
};
