// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import LinkService from "@/services/link/link.service";
import {
    LinkUpdateUserStateInputModel,
    LinkGetUserStateInputModel,
} from "@/services/types/link.service.types";
import { Identity } from "@dfinity/agent";
import { useIdentity } from "@nfid/identitykit/react";
import { useMutation, useQuery } from "@tanstack/react-query";

// Helper to generate the query key
export const getLinkUserStateQueryKey = (link_id: string, user_pid: string) =>
    ["linkUserState", link_id, user_pid] as const;

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
    const user_pid = identity?.getPrincipal().toText() ?? "";

    return useQuery({
        queryKey: getLinkUserStateQueryKey(input.link_id, user_pid),
        queryFn: async () => {
            const linkService = new LinkService(identity);
            const userState = await linkService.getLinkUserState(input);
            return userState;
        },
        enabled: isEnabled,
        refetchOnWindowFocus: false,
        staleTime: 1 * 1000, // 5 seconds
        retry: (failureCount, error) => {
            if (error.toString().includes("Identity is required")) {
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
