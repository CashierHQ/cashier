// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import LinkService from "@/services/link/link.service";
import {
  LinkUpdateUserStateInputModel,
  LinkGetUserStateInputModel,
} from "@/services/types/link.service.types";
import usePnpStore from "@/stores/plugAndPlayStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Helper to generate the query key
export const LINK_USER_STATE_QUERY_KEYS = (link_id: string, user_pid: string) =>
  ["linkUserState", link_id, user_pid] as const;

export function useUpdateLinkUserState(link_id: string) {
  const { pnp } = usePnpStore();
  const queryClient = useQueryClient();
  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationKey: LINK_USER_STATE_QUERY_KEYS(link_id, pnp.account?.owner ?? ""), // Add a static mutation key
    mutationFn: async (vars: { input: LinkUpdateUserStateInputModel }) => {
      const linkService = new LinkService(pnp);
      const result = await linkService.updateLinkUserState(vars.input);
      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific link user state query to ensure fresh data
      const userLinkStateQueryKey = LINK_USER_STATE_QUERY_KEYS(
        variables.input.link_id,
        pnp.account?.owner ?? "",
      );
      queryClient.invalidateQueries({
        queryKey: userLinkStateQueryKey,
        refetchType: "all",
      });
      queryClient.refetchQueries({
        queryKey: userLinkStateQueryKey,
        exact: true,
      });
      console.log("[useUpdateLinkUserState] refetch ", userLinkStateQueryKey);
    },
    onError: (e) => {
      console.error("Error updating link user state ", e.message);
    },
  });

  return mutation;
}

export function useLinkUserStateQuery(
  input: LinkGetUserStateInputModel,
  isEnabled: boolean,
) {
  const { pnp } = usePnpStore();
  if (!pnp) throw new Error("pnp is required");

  return useQuery({
    queryKey: LINK_USER_STATE_QUERY_KEYS(
      input.link_id,
      pnp.account?.owner ?? "",
    ),
    queryFn: async () => {
      console.log(
        "refetching link user state for ",
        input.link_id,
        pnp.account?.owner ?? "",
      );
      const linkService = new LinkService(pnp);
      const userState = await linkService.getLinkUserState(input);
      // avoid returning undefined if result is not found
      return userState ?? null;
    },
    enabled: isEnabled,
    retry: (failureCount, error) => {
      if (error.toString().includes("Identity is required")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export async function fetchLinkUserState(input: LinkGetUserStateInputModel) {
  const { pnp } = usePnpStore();
  if (!pnp) throw new Error("pnp is required");
  const linkService = new LinkService(pnp);
  return await linkService.getLinkUserState(input);
}
