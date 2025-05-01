import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LinkService from "@/services/link/link.service";
import { useIdentity } from "@nfid/identitykit/react";
import { ACTION_TYPE } from "@/services/types/enum";
import { UpdateLinkParams } from "./link-action-hooks";
import LinkLocalStorageService, {
    LOCAL_lINK_ID_PREFIX,
} from "@/services/link/link-local-storage.service";
import { groupLinkListByDate } from "@/utils";
import { LinkModel } from "@/services/types/link.service.types";
import {
    mapParitalLinkDtoToCreateLinkInputV2,
    mapPartialDtoToLinkDetailModel,
} from "@/services/types/mapper/link.service.mapper";

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
            try {
                const linkService = new LinkService(identity);
                const linkLocalStorageService = new LinkLocalStorageService(
                    identity.getPrincipal().toString(),
                );

                const res = await linkService.getLinkList();
                const localRes = linkLocalStorageService.getLinkList();

                // aggregate the results from both services
                const links = res.data.concat(localRes.data);

                const result = groupLinkListByDate(links.map((linkModel) => linkModel.link));

                return result;
            } catch (error) {
                console.error("Error fetching link list", error);
                throw error;
            }
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
            if (!identity) throw new Error("Identity is required");
            if (!linkId) throw new Error("linkId are required");

            if (linkId.startsWith(LOCAL_lINK_ID_PREFIX)) {
                const linkLocalStorageService = new LinkLocalStorageService(
                    identity.getPrincipal().toString(),
                );
                const localLink = linkLocalStorageService.getLink(linkId);

                const linkDetailModel = mapPartialDtoToLinkDetailModel(localLink);

                const linkModel: LinkModel = {
                    link: linkDetailModel,
                };

                if (localLink) {
                    return Promise.resolve(linkModel);
                } else {
                    throw new Error("Link not found in local storage");
                }
            } else {
                const linkService = new LinkService(identity);
                return await linkService.getLink(linkId, actionType);
            }
        },
        enabled: !!linkId,
        staleTime: staleTime, // Time in milliseconds data remains fresh
    });
}

export function useUpdateLinkMutation() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: UpdateLinkParams) => {
            if (!identity) throw new Error("Identity is required");
            const linkService = new LinkService(identity);
            const linkLocalStorageService = new LinkLocalStorageService(
                identity.getPrincipal().toString(),
            );
            const linkId = data.linkId;

            if (linkId.startsWith(LOCAL_lINK_ID_PREFIX)) {
                const localStorageLink = linkLocalStorageService.updateStateMachine(
                    data.linkId,
                    data.linkModel,
                    data.isContinue,
                );
                return Promise.resolve(localStorageLink);
            } else {
                const localLinkId = LOCAL_lINK_ID_PREFIX + linkId;
                const updated_link = linkService.updateLink(
                    data.linkId,
                    data.linkModel,
                    data.isContinue,
                );
                try {
                    const localStorage = linkLocalStorageService.updateStateMachine(
                        localLinkId,
                        data.linkModel,
                        data.isContinue,
                    );
                    console.log("localStorage", localStorage);
                } catch (error) {
                    console.error(
                        `
                        ======= IGNORE THIS ERROR =======
                        Error updating link in local storage
                        ======= IGNORE THIS ERROR =======
                        `,
                        error,
                    );
                }

                return updated_link;
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: LINK_QUERY_KEYS.list() });
            queryClient.invalidateQueries({
                queryKey: LINK_QUERY_KEYS.detail(data?.id),
            });
        },
        onError: (err) => {
            throw err;
        },
    });

    return mutation;
}

// hook call backend create link
export function useCreateNewLinkMutation() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (localLinkId: string) => {
            if (!identity) throw new Error("Identity is required");

            const linkService = new LinkService(identity);
            const linkLocalStorageService = new LinkLocalStorageService(
                identity.getPrincipal().toString(),
            );

            const link = linkLocalStorageService.getLink(localLinkId);

            const input = mapParitalLinkDtoToCreateLinkInputV2(link);

            const backendLink = await linkService.createLinkV2(input);

            return {
                link: backendLink,
                oldId: localLinkId,
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LINK_QUERY_KEYS.list() });
        },
        onError: (err) => {
            throw err;
        },
    });

    return mutation;
}
