import { FeeModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { IntentHelperService } from "@/services/fee.service";
import { useTokens } from "./useTokens";

export const useFeeMetadata = (feeModel: FeeModel) => {
    const { getToken, isLoadingBalances } = useTokens();

    // Get token data directly from useTokens
    const token = getToken(feeModel.address);

    const [assetAmount, setAssetAmount] = useState<number>();
    const [feeAmount, setFeeAmount] = useState<number>();

    useEffect(() => {
        if (token && token.decimals !== undefined) {
            // Calculate amounts using token data
            setAssetAmount(Number(feeModel.amount) / 10 ** token.decimals);

            // Set fee amount if present
            if (token.fee !== undefined) {
                setFeeAmount(Number(token.fee) / 10 ** token.decimals);
            }
        }
    }, [token, feeModel.amount]);

    return {
        assetAmount,
        assetSymbol: token?.symbol,
        assetSrc: `${IC_EXPLORER_IMAGES_PATH}${feeModel.address}`,
        feeAmount,
        feeSymbol: token?.symbol,
        feeIconSrc: `${IC_EXPLORER_IMAGES_PATH}${feeModel.address}`,
        isLoadingMetadata: isLoadingBalances || !token,
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
