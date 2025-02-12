import LinkService from "@/services/link.service";
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
                    const links = await linkService.getLinks();
                    //console.log("🚀 ~ queryFn: ~ links:", links);
                    groupedLinkList = groupLinkListByDate(links?.data.map((link) => link.link));
                } catch (err) {
                    //console.log("🚀 ~ queryFn: ~ err:", err);
                    throw err;
                }
                return groupedLinkList;
            },
        }),
        detail: (
            linkId: string | undefined,
            actionType: string,
            identity: Identity | PartialIdentity | undefined,
        ) => ({
            queryKey: [QUERY_KEYS.LINKS, linkId],
            queryFn: async () => {
                if (!linkId) throw new Error("Link ID is required");

                try {
                    const linkService = new LinkService(identity);
                    const linkDetail = await linkService.getLink(linkId, actionType);
                    return linkDetail;
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
