// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import LinkService, {
  UpdateActionInputModel,
} from "@/services/link/link.service";
import { ActionModel } from "@/services/types/action.service.types";
import { ACTION_TYPE, ACTION_STATE } from "@/services/types/enum";
import { Principal } from "@dfinity/principal";
import usePnpStore from "@/stores/plugAndPlayStore";
import { LINK_USER_STATE_QUERY_KEYS } from "./linkUserHooks";

// Base type for action parameters
type BaseActionParams = {
  linkId: string;
  actionType: ACTION_TYPE;
  actionId?: string;
};

// Anonymous actions require wallet address
type AnonymousActionParams = BaseActionParams & {
  walletAddress: string;
};

/**
 * Hook for creating a new action with authenticated user
 */
export function useCreateAction() {
  const { pnp } = usePnpStore();
  const queryClient = useQueryClient();
  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: (params: BaseActionParams) => {
      const linkService = new LinkService(pnp);
      return linkService.createAction(params);
    },
    onSuccess: (data, variables) => {
      // Invalidate all link detail queries for this link after action creation
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", variables.linkId],
      });
    },
  });

  return mutation;
}

/**
 * Hook for processing an action with authenticated user
 */
export function useProcessAction() {
  const queryClient = useQueryClient();
  const { pnp } = usePnpStore();

  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: (params: BaseActionParams) => {
      if (!params.actionId) {
        throw new Error("Action ID is required for processing");
      }
      const linkService = new LinkService(pnp);
      return linkService.processAction({
        linkId: params.linkId,
        actionType: params.actionType,
        actionId: params.actionId,
      });
    },
    onMutate: (variables) => {
      console.log("[useProcessAction] onMutate", variables);
      const queryKey: QueryKey = ["links", "detail", variables.linkId, variables.actionType];
      const userLinkStateQueryKey: QueryKey = LINK_USER_STATE_QUERY_KEYS(
        variables.linkId,
        pnp.account?.owner ?? "",
      );

      // Shared helper to determine whether to stop polling based on the latest action state
      const shouldStop = () => {
        let cached = undefined;
        if (variables.actionType === ACTION_TYPE.USE) {
          cached = queryClient.getQueryData(userLinkStateQueryKey) as { action?: ActionModel } | undefined;
          console.log("[useProcessAction] shouldStop cached", cached);
        } else {
          cached = queryClient.getQueryData(queryKey) as { action?: ActionModel } | undefined;
        }
        const latestAction = cached?.action;
        return (
          latestAction?.state === ACTION_STATE.PROCESSING ||
          latestAction?.state === ACTION_STATE.SUCCESS ||
          latestAction?.state === ACTION_STATE.FAIL
        );
      };

      // Start polling to surface PROCESSING state while backend handles the action
      const pollIntervalMs = 50;
      const maxPolls = 12;
      let polls = 0;

      const intervalId = setInterval(async () => {
        try {
          if (variables.actionType === ACTION_TYPE.USE) {
            console.log("[useProcessAction] polling userLinkStateQueryKey", userLinkStateQueryKey);
            await queryClient.invalidateQueries({ queryKey: userLinkStateQueryKey, refetchType: "all" });
          } else {
            await queryClient.invalidateQueries({ queryKey, refetchType: "all" });
          }

          if (shouldStop()) {
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error('Error during processAction polling:', err);
        }

        polls += 1;
        if (polls >= maxPolls) {
          clearInterval(intervalId);
        }
      }, pollIntervalMs);

      // Return interval id so React Query lifecycle handlers can clear it if needed
      return { intervalId };
    },
    onSettled: (_data, _error, _variables, context?: { intervalId?: ReturnType<typeof setInterval> }) => {
      try {
        console.log("[useProcessAction] context", context);
        if (context?.intervalId) {
          clearInterval(context.intervalId);
        }
      } catch (err) {
        console.error('Error clearing processAction poll interval onSettled:', err);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all link detail queries for this link after action processing
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", variables.linkId, variables.actionType],
      });
    },
  });

  return mutation;
}

/**
 * Hook for creating a new action anonymously
 */
export function useCreateActionAnonymous() {
  const queryClient = useQueryClient();
  const { pnp, account } = usePnpStore();

  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: (params: AnonymousActionParams) => {
      if (Principal.anonymous().toString() !== account?.owner) {
        throw new Error("Anonymous user cannot create action");
      }

      const linkService = new LinkService(pnp);

      return linkService.createActionAnonymous({
        linkId: params.linkId,
        actionType: params.actionType,
        walletAddress: params.walletAddress,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate all link detail queries for this link after anonymous action creation
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", variables.linkId],
      });
    },
  });

  return mutation;
}

/**
 * Hook for processing an existing action anonymously
 */
export function useProcessActionAnonymous() {
  const queryClient = useQueryClient();
  const { pnp, account } = usePnpStore();

  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: (params: AnonymousActionParams) => {
      if (Principal.anonymous().toString() !== account?.owner) {
        throw new Error("Anonymous user cannot create action");
      }
      if (!params.actionId) {
        throw new Error("Action ID is required for processing");
      }

      const linkService = new LinkService(pnp);

      return linkService.processActionAnonymousV2({
        linkId: params.linkId,
        actionType: params.actionType,
        actionId: params.actionId,
        walletAddress: params.walletAddress,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate all link detail queries for this link after anonymous action processing
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", variables.linkId],
      });
    },
  });

  return mutation;
}

export function useUpdateAction() {
  const queryClient = useQueryClient();
  const { pnp } = usePnpStore();

  if (!pnp) throw new Error("pnp is required");

  const mutation = useMutation({
    mutationFn: (vars: UpdateActionInputModel) => {
      const linkService = new LinkService(pnp);
      return linkService.updateAction(vars);
    },
    onSuccess: (data, variables) => {
      // Invalidate all link detail queries for this link after action update
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", variables.linkId],
      });
    },
  });

  return mutation;
}
