// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { FeeModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import { IntentHelperService } from "@/services/fee.service";
import { useTokens } from "./useTokens";

export const useFeeMetadata = (feeModel: FeeModel) => {
    const { getToken, isLoadingBalances } = useTokens();

    // Get token data directly from useTokens
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
