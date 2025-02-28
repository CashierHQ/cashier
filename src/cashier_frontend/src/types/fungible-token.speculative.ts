import { Chain } from "@/services/types/link.service.types";

export type FungibleToken = {
    address: string;
    chain: Chain;
    name: string;
    symbol: string;
    logo: string;
    decimals: number;
    amount: number; // TODO: change to BigNumber,
    usdEquivalent: number | null;
};
