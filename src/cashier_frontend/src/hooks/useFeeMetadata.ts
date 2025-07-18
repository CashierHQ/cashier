// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { FeeModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import { IntentHelperService } from "@/services/fee.service";
import { useTokensV2 } from "./token/useTokensV2";

export const useFeeMetadata = (feeModel: FeeModel) => {
    const { getToken, isLoadingBalances } = useTokensV2();

    const token = getToken(feeModel.address);
    const feeToken = getToken(feeModel.address);

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
        token,
        assetAmount,
        assetSymbol: token?.symbol,
        assetSrc: token?.logo,
        feeAmount,
        feeSymbol: token?.symbol,
        feeIconSrc: feeToken?.logo,
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
