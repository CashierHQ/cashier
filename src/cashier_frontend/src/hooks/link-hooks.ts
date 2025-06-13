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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LinkService from "@/services/link/link.service";
import { useIdentity } from "@nfid/identitykit/react";
import { ACTION_TYPE } from "@/services/types/enum";
import { UpdateLinkParams } from "./useLinkAction";
import { LOCAL_lINK_ID_PREFIX } from "@/services/link/link-local-storage.service";
import { groupLinkListByDate } from "@/utils";
import { LinkModel } from "@/services/types/link.service.types";
import {
    mapParitalLinkDtoToCreateLinkInputV2,
    mapPartialDtoToLinkDetailModel,
} from "@/services/types/mapper/link.service.mapper";
import LinkLocalStorageServiceV2 from "@/services/link/link-local-storage.service.v2";

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
                const linkLocalStorageService = new LinkLocalStorageServiceV2(
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
    const staleTime = 60 * 1000; // 1 minute

    return useQuery({
        queryKey: LINK_QUERY_KEYS.detail(linkId),
        queryFn: async () => {
            if (!linkId) throw new Error("linkId are required");

            if (linkId.startsWith(LOCAL_lINK_ID_PREFIX) && identity) {
                const linkLocalStorageService = new LinkLocalStorageServiceV2(
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

                // this should support case identity is undefined = anonymous wallet
            } else {
                const linkService = new LinkService(identity);
                const res = await linkService.getLink(linkId, actionType);

                return res;
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
            const linkLocalStorageService = new LinkLocalStorageServiceV2(
                identity.getPrincipal().toString(),
            );
            const linkId = data.linkId;

            if (linkId.startsWith(LOCAL_lINK_ID_PREFIX)) {
                const localStorageLink = linkLocalStorageService.callUpdateLink(
                    data.linkId,
                    data.linkModel,
                    data.isContinue,
                );
                return Promise.resolve(localStorageLink);
            } else {
                const updated_link = linkService.updateLink(
                    data.linkId,
                    data.linkModel,
                    data.isContinue,
                );

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
            const linkLocalStorageService = new LinkLocalStorageServiceV2(
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
