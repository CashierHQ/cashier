import useTokenMetadataQuery from "@/hooks/useTokenMetadataQuery";
import { IntentModel } from "@/services/types/intent.service.types";
import { convertDecimalBigIntToNumber } from "@/utils";
import { useEffect, useState } from "react";

export const useTransactionItemMeta = (intent: IntentModel) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>();
    const [displayAmount, setDisplayAmount] = useState<number>();
    const [displayNetworkFee, setDisplayNetworkFee] = useState<number>();

    const {
        data: tokenData,
        isLoading: isLoadingMetadata,
        isSuccess: isSuccessLoadingMetadata,
    } = useTokenMetadataQuery(intent.asset.address);

    useEffect(() => {
        if (isSuccessLoadingMetadata) {
            const tokenSymbol = tokenData.metadata.symbol;
            setTokenSymbol(tokenSymbol);

            const decimals = tokenData.metadata.decimals;
            const amount = intent.amount;
            const fee = tokenData.metadata.fee;

            setDisplayAmount(convertDecimalBigIntToNumber(amount, decimals));
            setDisplayNetworkFee(convertDecimalBigIntToNumber(fee, decimals));
        }
    }, [isSuccessLoadingMetadata]);

    return {
        tokenSymbol,
        displayAmount,
        displayNetworkFee,
        isLoadingMetadata,
    };
};
