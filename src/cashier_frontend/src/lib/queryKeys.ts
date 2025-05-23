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

import LinkService from "@/services/link/link.service";
import { LinkGetUserStateInputModel } from "@/services/types/link.service.types";
import { UsdConversionService } from "@/services/usdConversionService";
import UserService from "@/services/user.service";
import { groupLinkListByDate } from "@/utils";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister, IcrcTokenMetadata, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent } from "@dfinity/utils";
import { createQueryKeyStore } from "@lukemorales/query-key-factory";

const METADATA_LIST_KEY = "metadataList";

export interface TokenMetadataWithCanisterId {
    canisterId: string;
    metadata: IcrcTokenMetadata;
}

export const QUERY_KEYS = {
    USERS: "users",
    LINKS: "links",
    TOKENS: "tokens",
};

export const queryKeys = createQueryKeyStore({
    users: {
        detail: (identity: Identity | PartialIdentity | undefined) => ({
            queryKey: [QUERY_KEYS.USERS],
            queryFn: async () => {
                try {
                    const userService = new UserService(identity);
                    const user = await userService.getUser();
                    return user;
                } catch (error) {
                    console.log("🚀 ~ queryFn: ~ error:", error);
                    throw error;
                }
            },
        }),
    },
    links: {
        list: (identity: Identity | PartialIdentity | undefined) => ({
            queryKey: [QUERY_KEYS.LINKS],
            queryFn: async () => {
                let groupedLinkList = null;
                try {
                    const linkService = new LinkService(identity);
                    const links = await linkService.getLinkList();
                    groupedLinkList = groupLinkListByDate(links?.data.map((link) => link.link));
                } catch (err) {
                    console.log("🚀 ~ queryFn: ~ links list:", err);
                    throw err;
                }
                return groupedLinkList;
            },
        }),
        detail: (
            linkId: string | undefined,
            identity: Identity | PartialIdentity | undefined,
            actionType?: string,
        ) => ({
            queryKey: [QUERY_KEYS.LINKS, linkId],
            queryFn: async () => {
                if (!linkId) throw new Error("Link ID is required");
                try {
                    const linkService = identity ? new LinkService(identity) : new LinkService();
                    const linkDetail = await linkService.getLink(linkId, actionType);
                    return linkDetail;
                } catch (error) {
                    console.log("🚀 ~ queryFn: ~ error:", error);
                    throw error;
                }
            },
        }),

        feePreview: (
            linkId: string | undefined,
            identity: Identity | PartialIdentity | undefined,
        ) => ({
            queryKey: ["links", "feePreview", linkId],
            queryFn: async () => {
                if (!linkId || !identity) return [];
                const linkService = new LinkService(identity);
                return linkService.getFeePreview(linkId);
            },
        }),
        userState: (
            input: LinkGetUserStateInputModel,
            identity: Identity | PartialIdentity | undefined,
        ) => ({
            queryKey: [QUERY_KEYS.LINKS, input.link_id, input.action_type],
            queryFn: async () => {
                try {
                    const linkService = new LinkService(identity);
                    const userState = await linkService.getLinkUserState(input);
                    return userState;
                } catch (error) {
                    console.log("🚀 ~ queryFn: ~ error:", error);
                    throw error;
                }
            },
        }),
    },
    tokens: {
        metadata: (tokenAddress: string | undefined) => ({
            queryKey: [QUERY_KEYS.TOKENS, tokenAddress],
            queryFn: async () => {
                if (!tokenAddress) throw new Error("Token address is required");

                // Fetch existing metadata list from localStorage
                const existingMetadataList: TokenMetadataWithCanisterId[] = deserializeMetadataList(
                    localStorage.getItem(METADATA_LIST_KEY) || "[]",
                );

                // Check if the token metadata is already in the list
                const existingMetadata = existingMetadataList.find(
                    (metadata) => metadata.canisterId === tokenAddress,
                );
                if (existingMetadata) {
                    return existingMetadata;
                }

                // Fetch new token metadata
                const { metadata } = IcrcLedgerCanister.create({
                    agent: defaultAgent(),
                    canisterId: Principal.fromText(tokenAddress),
                });
                const data = await metadata({});
                const newMetadata: TokenMetadataWithCanisterId = {
                    canisterId: tokenAddress,
                    metadata: mapTokenMetadata(data) as IcrcTokenMetadata,
                };

                // Add new token metadata to the list
                const updatedMetadataList = [...existingMetadataList, newMetadata];

                // Save updated metadata list to localStorage
                localStorage.setItem(METADATA_LIST_KEY, serializeMetadataList(updatedMetadataList));

                return newMetadata;
            },
        }),
        metadataList: () => ({
            queryKey: [QUERY_KEYS.TOKENS, "metadataList"],
            queryFn: async () => {
                // Fetch the existing metadata list from localStorage
                const metadataList: TokenMetadataWithCanisterId[] = deserializeMetadataList(
                    localStorage.getItem(METADATA_LIST_KEY) || "[]",
                );
                return metadataList;
            },
        }),
        conversionRates: (wallet: string | undefined, asset: string | undefined) => ({
            queryKey: [QUERY_KEYS.TOKENS, "conversionRates", wallet, asset],
            queryFn: async () => {
                if (!wallet) throw new Error("Wallet address is required");
                if (!asset) throw new Error("Token address is required");

                const conversionRates = await UsdConversionService.getConversionRates(
                    wallet,
                    asset,
                );

                return conversionRates;
            },
        }),
    },
});

// Helper functions to serialize and deserialize metadata list
const serializeMetadataList = (metadataList: TokenMetadataWithCanisterId[]): string => {
    return JSON.stringify(metadataList, (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
    );
};

const deserializeMetadataList = (serializedMetadataList: string): TokenMetadataWithCanisterId[] => {
    return JSON.parse(serializedMetadataList, (key, value) =>
        typeof value === "string" && /^\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value,
    );
};
