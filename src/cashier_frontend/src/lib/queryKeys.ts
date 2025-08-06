// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import LinkService from "@/services/link/link.service";
import { LinkGetUserStateInputModel } from "@/services/types/link.service.types";
import UserService from "@/services/user.service";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { createQueryKeyStore } from "@lukemorales/query-key-factory";

interface TokenMetadataWithCanisterId {
    canisterId: string;
    metadata: IcrcTokenMetadata;
}

const QUERY_KEYS = {
    USERS: "users",
    LINKS: "links",
    TOKENS: "tokens",
};

const USER_LINK_QUERY = {
    userState: (linkId: string, action: string, pid: string) => ["userState", pid, action, linkId],
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
});
