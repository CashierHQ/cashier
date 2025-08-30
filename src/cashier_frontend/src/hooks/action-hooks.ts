// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService, {
  UpdateActionInputModel,
} from "@/services/link/link.service";
import { ACTION_TYPE } from "@/services/types/enum";
import { Principal } from "@dfinity/principal";

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
  const identity = useIdentity();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: BaseActionParams) => {
      const linkService = new LinkService(identity);
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
  const identity = useIdentity();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: BaseActionParams) => {
      if (!params.actionId) {
        throw new Error("Action ID is required for processing");
      }
      const linkService = new LinkService(identity);
      return linkService.processAction({
        linkId: params.linkId,
        actionType: params.actionType,
        actionId: params.actionId,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate all link detail queries for this link after action processing
      queryClient.invalidateQueries({
        queryKey: ["links", "detail", variables.linkId],
      });
    },
  });

  return mutation;
}

/**
 * Hook for creating a new action anonymously
 */
export function useCreateActionAnonymous() {
  const identity = useIdentity();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: AnonymousActionParams) => {
      if (identity && Principal.anonymous() !== identity.getPrincipal()) {
        throw new Error("Anonymous user cannot create action");
      }

      const linkService = new LinkService(identity);

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
  const identity = useIdentity();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (params: AnonymousActionParams) => {
      if (identity && Principal.anonymous() !== identity.getPrincipal()) {
        throw new Error("Anonymous user cannot create action");
      }
      if (!params.actionId) {
        throw new Error("Action ID is required for processing");
      }

      const linkService = new LinkService(identity);

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
  const identity = useIdentity();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (vars: UpdateActionInputModel) => {
      const linkService = new LinkService(identity);
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
