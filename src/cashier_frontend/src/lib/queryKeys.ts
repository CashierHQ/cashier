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
import UserService from "@/services/user.service";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { createQueryKeyStore } from "@lukemorales/query-key-factory";

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
