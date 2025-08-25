// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LinkService from "@/services/link/link.service";
import { useIdentity } from "@nfid/identitykit/react";
import { ACTION_TYPE } from "@/services/types/enum";
import { UpdateLinkParams } from "./useLinkMutations";
import { LOCAL_lINK_ID_PREFIX } from "@/services/link/link-local-storage.service";
import { groupLinkListByDate } from "@/utils";
import { LinkModel } from "@/services/types/link.service.types";
import {
  mapParitalLinkDtoToCreateLinkInput,
  mapPartialDtoToLinkDetailModel,
} from "@/services/types/mapper/link.service.mapper";
import LinkLocalStorageServiceV2 from "@/services/link/link-local-storage.service.v2";
import { Identity } from "@dfinity/agent";

// Centralized query keys for consistent caching
const LINK_QUERY_KEYS = {
  all: ["links"] as const,
  list: () => [...LINK_QUERY_KEYS.all, "list"] as const,
  detail: (linkId: string | undefined, actionType?: ACTION_TYPE) =>
    [...LINK_QUERY_KEYS.all, "detail", linkId, actionType] as const,
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

        const result = groupLinkListByDate(
          links.map((linkModel) => linkModel.link),
        );

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
    queryKey: LINK_QUERY_KEYS.detail(linkId, actionType),
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

export const getLinkDetailQuery = async (
  linkId: string,
  actionType: ACTION_TYPE,
  identity: Identity | undefined,
) => {
  const linkService = new LinkService(identity);
  const res = await linkService.getLink(linkId, actionType);
  return res;
};

export function useUpdateLinkMutation() {
  const identity = useIdentity();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateLinkParams) => {
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
        const updated_link = await linkService.updateLink(
          data.linkId,
          data.linkModel,
          data.isContinue,
        );

        return updated_link;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LINK_QUERY_KEYS.list() });
      // Invalidate all detail queries for this link (all actionTypes)
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", data?.id],
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

      const input = mapParitalLinkDtoToCreateLinkInput(link);

      const backendLink = await linkService.createLinkV2(input);

      return {
        link: backendLink,
        oldId: localLinkId,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LINK_QUERY_KEYS.list() });
      // Invalidate all detail queries for the new link
      if (data?.link?.id) {
        queryClient.invalidateQueries({
          queryKey: ["links", "detail", data.link.id],
        });
      }
    },
    onError: (err) => {
      throw err;
    },
  });

  return mutation;
}

// Utility function to invalidate link detail queries for action updates
export function useInvalidateLinkDetailQueries() {
  const queryClient = useQueryClient();

  return (linkId: string) => {
    // Invalidate all detail queries for this link (all actionTypes)
    queryClient.invalidateQueries({
      queryKey: ["links", "detail", linkId],
    });
  };
}
