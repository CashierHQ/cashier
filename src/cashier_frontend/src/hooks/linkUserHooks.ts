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

import { queryKeys } from "@/lib/queryKeys";
import LinkService from "@/services/link/link.service";
import {
    LinkUpdateUserStateInputModel,
    LinkGetUserStateInputModel,
} from "@/services/types/link.service.types";
import { Identity } from "@dfinity/agent";
import { useIdentity } from "@nfid/identitykit/react";
import { useMutation, useQuery } from "@tanstack/react-query";

export function useUpdateLinkUserState() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async (vars: { input: LinkUpdateUserStateInputModel }) => {
            const linkService = new LinkService(identity);
            const result = await linkService.updateLinkUserState(vars.input);
            return result;
        },
        onError: (e) => {
            console.error("Error updating link user state ", e.message);
        },
    });

    return mutation;
}

export function useLinkUserState(input: LinkGetUserStateInputModel, isEnabled: boolean) {
    const identity = useIdentity();

    return useQuery({
        queryKey: queryKeys.links.userState(input, identity).queryKey,
        queryFn: async () => {
            const linkService = new LinkService(identity);
            const userState = await linkService.getLinkUserState(input);
            console.log("Fetched link user state: ", userState);
            return userState;
        },
        enabled: isEnabled,
        refetchOnWindowFocus: false,
        // Add stale time to prevent immediate refetches when identity changes
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Add retry options to manage refetches
        retry: (failureCount, error) => {
            if (error.toString().includes("Identity is required")) {
                // Don't retry identity errors - wait for proper identity
                return false;
            }
            return failureCount < 2;
        },
    });
}

export async function fetchLinkUserState(
    input: LinkGetUserStateInputModel,
    identity: Identity | undefined,
) {
    const linkService = new LinkService(identity);
    return await linkService.getLinkUserState(input);
}
