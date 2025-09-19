// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import LinkService from "@/services/link/link.service";
import {
  LinkUpdateUserStateInputModel,
  LinkGetUserStateInputModel,
} from "@/services/types/link.service.types";
import usePnpStore from "@/stores/plugAndPlayStore";
import { useMutation, useQuery } from "@tanstack/react-query";

// Helper to generate the query key
export const LINK_USER_STATE_QUERY_KEYS = (link_id: string, user_pid: string) =>
  ["linkUserState", link_id, user_pid] as const;

export function useUpdateLinkUserState() {
  const { pnp } = usePnpStore();
  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: async (vars: { input: LinkUpdateUserStateInputModel }) => {
      const linkService = new LinkService(pnp);
      const result = await linkService.updateLinkUserState(vars.input);
      return result;
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
      const linkService = new LinkService(pnp);
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

export async function fetchLinkUserState(input: LinkGetUserStateInputModel) {
  const { pnp } = usePnpStore();
  if (!pnp) throw new Error("pnp is required");
  const linkService = new LinkService(pnp);
  return await linkService.getLinkUserState(input);
}
