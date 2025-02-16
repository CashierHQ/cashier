import { useQuery } from "@tanstack/react-query";
import { useWalletAddress } from "./useWalletAddress";
import { queryKeys } from "@/lib/queryKeys";

export function useConversionRatesQuery(asset: string | undefined) {
    const wallet = useWalletAddress();

    const query = useQuery({
        ...queryKeys.tokens.conversionRates(wallet, asset),
        enabled: !!wallet && !!asset,
    });

    return query;
}
