import { useQuery } from "@tanstack/react-query";
import { queryKeys, TokenMetadataWithCanisterId } from "@/lib/queryKeys";

const useTokenMetadataQuery = (tokenAddress: string | undefined) => {
    return useQuery<TokenMetadataWithCanisterId>({
        queryKey: queryKeys.tokens.metadata(tokenAddress).queryKey,
        queryFn: async () => {
            const metadata: TokenMetadataWithCanisterId = await queryKeys.tokens
                .metadata(tokenAddress)
                .queryFn({
                    queryKey: queryKeys.tokens.metadata(tokenAddress).queryKey,
                    signal: new AbortController().signal,
                    meta: undefined,
                });
            if (!metadata) {
                throw new Error("Token metadata not found");
            }
            return metadata;
        },
        enabled: !!tokenAddress,
    });
};

export const useTokenMetadataList = () => {
    return useQuery<TokenMetadataWithCanisterId[]>({
        queryKey: queryKeys.tokens.metadataList().queryKey,
        queryFn: async () => {
            const metadataList: TokenMetadataWithCanisterId[] = await queryKeys.tokens
                .metadataList()
                .queryFn({
                    queryKey: queryKeys.tokens.metadataList().queryKey,
                    signal: new AbortController().signal,
                    meta: undefined,
                });
            if (!metadataList) {
                throw new Error("Token metadata list not found");
            }
            return metadataList;
        },
    });
};

export default useTokenMetadataQuery;
