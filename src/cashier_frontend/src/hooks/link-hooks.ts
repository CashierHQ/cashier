import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LinkService from "@/services/link.service";
import { useIdentity } from "@nfid/identitykit/react";
import { ACTION_TYPE } from "@/services/types/enum";
import { UpdateLinkParams2 } from "./linkActionHook";

// Centralized query keys for consistent caching
export const LINK_QUERY_KEYS = {
    all: ["links"] as const,
    list: () => [...LINK_QUERY_KEYS.all, "list"] as const,
    detail: (linkId: string | undefined) => [...LINK_QUERY_KEYS.all, "detail", linkId] as const,
};

// React Query for fetching the list of links
export function useLinksListQuery() {
    const identity = useIdentity();

    return useQuery({
        queryKey: LINK_QUERY_KEYS.list(),
        queryFn: async () => {
            if (!identity) throw new Error("Identity is required");
            const linkService = new LinkService(identity);
            return await linkService.getLinkList();
        },
        enabled: !!identity,
    });
}

// React Query for fetching link details
export function useLinkDetailQuery(linkId?: string, actionType?: ACTION_TYPE) {
    const identity = useIdentity();
    const staleTime = 30 * 60 * 1000; // Default 30 minutes, or use provided value

    return useQuery({
        queryKey: LINK_QUERY_KEYS.detail(linkId),
        queryFn: async () => {
            if (!identity || !linkId) throw new Error("Identity and linkId are required");
            const linkService = new LinkService(identity);
            return await linkService.getLink(linkId, actionType);
        },
        enabled: !!identity && !!linkId,
        staleTime: staleTime, // Time in milliseconds data remains fresh
    });
}

export function useUpdateLink() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: UpdateLinkParams2) => {
            const linkService = new LinkService(identity);
            return linkService.updateLink(data.linkId, data.linkModel, data.isContinue);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: LINK_QUERY_KEYS.list() });
            queryClient.invalidateQueries({
                queryKey: LINK_QUERY_KEYS.detail(data.id),
            });
        },
        onError: (err) => {
            throw err;
        },
    });

    return mutation;
}
