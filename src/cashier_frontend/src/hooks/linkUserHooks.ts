// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { USER_LINK_QUERY } from "@/lib/queryKeys";
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
        queryKey: USER_LINK_QUERY.userState(
            input.link_id,
            input.action_type,
            identity?.getPrincipal().toText() ?? "",
        ),
        queryFn: async () => {
            const linkService = new LinkService(identity);
            const userState = await linkService.getLinkUserState(input);
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
