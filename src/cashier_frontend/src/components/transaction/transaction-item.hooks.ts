import { IntentModel } from "@/services/types/intent.service.types";
import { useEffect, useState } from "react";
import { useTokens } from "@/hooks/useTokens";

export const useTransactionItemMeta = (intent: IntentModel) => {
    const [tokenSymbol, setTokenSymbol] = useState<string>();
    const [displayAmount, setDisplayAmount] = useState<number>();
    const [displayNetworkFee, setDisplayNetworkFee] = useState<number>();

    const { getToken, isLoadingBalances } = useTokens();

    // Get token data directly from useTokens
    const token = getToken(intent.asset.address);

    useEffect(() => {
        if (token && token.decimals !== undefined) {
            // Set token symbol
            setTokenSymbol(token.symbol);

            // Calculate amount using token decimals
            setDisplayAmount(Number(intent.amount) / 10 ** token.decimals);

            // Calculate network fee if present
            if (token.fee !== undefined) {
                setDisplayNetworkFee(Number(token.fee) / 10 ** token.decimals);
            }
        }
    }, [token, intent.amount]);

    return {
        tokenSymbol,
        displayAmount,
        displayNetworkFee,
        isLoadingMetadata: isLoadingBalances || !token,
    };
};
