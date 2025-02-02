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

export default useTokenMetadataQuery;
