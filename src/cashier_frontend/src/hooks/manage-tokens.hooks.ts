import { FungibleToken } from "@/types/fungible-token.speculative";
import { useMemo } from "react";

export function useTokensBySearchQuery(tokens: FungibleToken[], query: string) {
    return useMemo(() => {
        return tokens.filter((token) => {
            const lcSearchQuery = query.toLocaleLowerCase().trim();
            const lcName = token.name.toLocaleLowerCase();
            const lcSymbol = token.symbol.toLocaleLowerCase();

            return lcName.includes(lcSearchQuery) || lcSymbol.includes(lcSearchQuery);
        });
    }, [tokens, query]);
}
