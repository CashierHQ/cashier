import { Chain } from "@/services/types/link.service.types";

export type FungibleToken = {
    address: string;
    chain: Chain;
    name: string;
    symbol: string;
    logo: string;
    decimals: number;
    amount: bigint;
    usdEquivalent: number | null;
    usdConversionRate: number | null;
    enabled: boolean;
    default: boolean;
    id: string;
};
