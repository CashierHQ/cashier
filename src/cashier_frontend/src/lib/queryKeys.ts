import LinkService from "@/services/link.service";
import UserService from "@/services/user.service";
import { groupLinkListByDate } from "@/utils";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister, mapTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { defaultAgent } from "@dfinity/utils";
import { createQueryKeyStore } from "@lukemorales/query-key-factory";

export const queryKeys = createQueryKeyStore({
    users: {
        detail: (identity: Identity | PartialIdentity | undefined) => ({
            queryKey: ["users"],
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
            queryKey: ["links"],
            queryFn: async () => {
                let groupedLinkList = null;
                try {
                    const linkService = new LinkService(identity);
                    const links = await linkService.getLinks();
                    groupedLinkList = groupLinkListByDate(links?.data.map((link) => link.link));
                } catch (err) {
                    console.log("🚀 ~ queryFn: ~ err:", err);
                    throw err;
                }
                return groupedLinkList;
            },
        }),
    },
    tokens: {
        metadata: (tokenAddress: string | undefined) => ({
            queryKey: ["tokens", tokenAddress],
            queryFn: async () => {
                if (!tokenAddress) throw new Error("Token address is required");
                const { metadata } = IcrcLedgerCanister.create({
                    agent: defaultAgent(),
                    canisterId: Principal.fromText(tokenAddress),
                });
                const data = await metadata({});
                return mapTokenMetadata(data);
            },
        }),
    },
});
