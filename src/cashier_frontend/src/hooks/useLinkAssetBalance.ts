// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { BACKEND_CANISTER_ID } from "@/const";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { IcrcAccount } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { parse as uuidParse } from "uuid";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

const linkIdToSubaccount = (id: string) => {
    const uuidBytes = uuidParse(id);
    // DO NOT CHANGE THE ORDER OF THE BYTES
    const subaccount = new Uint8Array(32);
    subaccount.set(uuidBytes, 0);
    return subaccount;
};

export type BalanceItem = {
    tokenAddress: Principal;
    balance: bigint;
};

type UseLinkAssetBalanceReturn = {
    balances: BalanceItem[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
};

// Query keys for link asset balances
const LINK_ASSET_BALANCE_QUERY_KEYS = {
    all: ["linkAssetBalance"] as const,
    balances: (linkId: string) =>
        [...LINK_ASSET_BALANCE_QUERY_KEYS.all, "balances", linkId] as const,
};

export const useLinkAssetBalance = (link: LinkDetailModel): UseLinkAssetBalanceReturn => {
    // Memoize the account and ledgers to prevent unnecessary re-computations
    const account: IcrcAccount = useMemo(() => {
        const subaccount = linkIdToSubaccount(link.id);
        return {
            owner: Principal.from(BACKEND_CANISTER_ID),
            subaccount: subaccount ? new Uint8Array(subaccount) : undefined,
        };
    }, [link.id]);

    const ledgers = useMemo(
        () =>
            link.asset_info
                ?.filter((asset) => asset.chain === "IC")
                .map((asset) => Principal.fromText(asset.address)) ?? [],
        [link.asset_info],
    );

    // Use React Query for data fetching
    const {
        data: balances = [],
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: LINK_ASSET_BALANCE_QUERY_KEYS.balances(link.id),
        queryFn: async (): Promise<BalanceItem[]> => {
            if (!link?.id || ledgers.length === 0) {
                return [];
            }

            try {
                const tokenUtilsService = new TokenUtilService();

                // Fix the account type issue by ensuring subaccount is Uint8Array
                const queryAccount = {
                    owner: account.owner,
                    subaccount: account.subaccount as Uint8Array | undefined,
                };

                const fetchedBalances = await tokenUtilsService.batchBalanceOfAccount(
                    queryAccount,
                    ledgers,
                );

                // Validate the response structure
                if (Array.isArray(fetchedBalances) && fetchedBalances.every(isValidBalanceItem)) {
                    return fetchedBalances;
                } else {
                    console.warn("Invalid balance response structure:", fetchedBalances);
                    return [];
                }
            } catch (err) {
                console.error("Error fetching link asset balances:", err);
                throw err;
            }
        },
        enabled: !!link?.id && ledgers.length > 0,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 30 * 1000, // Refetch every 30 seconds
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    });

    return {
        balances,
        loading,
        error: error?.message || null,
        refetch,
    };
};

// Utility function to validate balance item structure
const isValidBalanceItem = (item: unknown): item is BalanceItem => {
    if (!item || typeof item !== "object" || item === null) {
        return false;
    }

    const obj = item as Record<string, unknown>;
    return "tokenAddress" in obj && "balance" in obj && typeof obj.balance === "bigint";
};
