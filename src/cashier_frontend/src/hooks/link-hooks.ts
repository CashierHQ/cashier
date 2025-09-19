// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LinkService from "@/services/link/link.service";
import { ACTION_TYPE } from "@/services/types/enum";
import { UpdateLinkParams } from "./useLinkMutations";
import { groupLinkListByDate } from "@/utils";
import { LinkModel } from "@/services/types/link.service.types";
import { mapLinkDetailModelToCreateLinkInput } from "@/services/types/mapper/link.service.mapper";
import LinkLocalStorageServiceV2, {
  LOCAL_lINK_ID_PREFIX,
} from "@/services/link/link-local-storage.service.v2";
import { LinkDto } from "@/generated/cashier_backend/cashier_backend.did";
import usePnpStore from "@/stores/plugAndPlayStore";

// Centralized query keys for consistent caching
const LINK_QUERY_KEYS = {
  all: ["links"] as const,
  list: () => [...LINK_QUERY_KEYS.all, "list"] as const,
  detail: (linkId: string | undefined, actionType?: ACTION_TYPE) =>
    [...LINK_QUERY_KEYS.all, "detail", linkId, actionType] as const,
};

// React Query for fetching the list of links
export function useLinksListQuery() {
  const { pnp, account } = usePnpStore();

  return useQuery({
    queryKey: LINK_QUERY_KEYS.list(),
    queryFn: async () => {
      if (!pnp) throw new Error("pnp is required");
      try {
        const linkService = new LinkService(pnp);
        if (!account?.owner) {
          throw new Error(
            "pnp account owner is required for fetching link list",
          );
        }
        const linkLocalStorageService = new LinkLocalStorageServiceV2(
          account?.owner,
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
    enabled: !!account,
  });
}

// React Query for fetching link details
export function useLinkDetailQuery(linkId?: string, actionType?: ACTION_TYPE) {
  const { pnp, account } = usePnpStore();
  const staleTime = 60 * 1000; // 1 minute

  return useQuery({
    queryKey: LINK_QUERY_KEYS.detail(linkId, actionType),
    queryFn: async (): Promise<LinkModel> => {
      if (!linkId) throw new Error("linkId are required");
      if (!pnp) throw new Error("pnp is required");

      // This is for creating link flow
      if (linkId.startsWith(LOCAL_lINK_ID_PREFIX)) {
        if (!pnp.account?.owner) {
          throw new Error("pnp account owner is required for local links");
        }
        const linkLocalStorageService = new LinkLocalStorageServiceV2(
          pnp.account?.owner,
        );
        const localLink = linkLocalStorageService.getLink(linkId);
        const linkModel: LinkModel = {
          link: localLink,
        };

        if (localLink) {
          return linkModel;
        } else {
          throw new Error("Link not found in local storage");
        }
      }
      // this is for using link flow
      else {
        const linkService = new LinkService(pnp, {
          // anon mode is needed for create_linl flow and use link flow if they're login
          // if anon = true, it only use for user landing at the page without login
          anon: !!account ? false : true,
        });
        const res = await linkService.getLink(linkId, actionType);

        return res;
      }
    },
    enabled: !!linkId,
    staleTime: staleTime, // Time in milliseconds data remains fresh
  });
}

export function useUpdateLinkMutation() {
  const { pnp } = usePnpStore();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateLinkParams): Promise<LinkDto> => {
      if (!pnp) throw new Error("pnp is required");
      const linkService = new LinkService(pnp);
      if (!pnp.account?.owner) {
        throw new Error("pnp account owner is required for updating link");
      }
      const linkLocalStorageService = new LinkLocalStorageServiceV2(
        pnp.account?.owner,
      );
      const linkId = data.linkId;

      if (linkId.startsWith(LOCAL_lINK_ID_PREFIX)) {
        const localStorageLink = linkLocalStorageService.callUpdateLink(
          data.linkId,
          data.linkModel,
          data.isContinue,
          pnp.account?.owner,
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
  const { pnp } = usePnpStore();
  const queryClient = useQueryClient();

  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: async (localLinkId: string) => {
      if (!pnp) throw new Error("pnp is required");

      const linkService = new LinkService(pnp);
      if (!pnp.account?.owner) {
        throw new Error("pnp account owner is required for creating link");
      }
      const linkLocalStorageService = new LinkLocalStorageServiceV2(
        pnp.account?.owner,
      );

      const link = linkLocalStorageService.getLink(localLinkId);

      const input = mapLinkDetailModelToCreateLinkInput(link);

      const backendLink = await linkService.createLink(input);

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
