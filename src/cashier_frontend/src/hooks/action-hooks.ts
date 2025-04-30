import { useMutation } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService, { UpdateActionInputModel } from "@/services/link/link.service";
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

    const mutation = useMutation({
        mutationFn: (params: BaseActionParams) => {
            const linkService = new LinkService(identity);
            return linkService.processAction(params);
        },
    });

    return mutation;
}

/**
 * Hook for processing an action with authenticated user
 */
export function useProcessAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (params: BaseActionParams) => {
            const linkService = new LinkService(identity);
            return linkService.processAction(params);
        },
    });

    return mutation;
}

/**
 * Hook for creating a new action anonymously
 */
export function useCreateActionAnonymous() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (params: AnonymousActionParams) => {
            if (identity && Principal.anonymous() !== identity.getPrincipal()) {
                throw new Error("Anonymous user cannot create action");
            }

            const linkService = new LinkService(identity);

            return linkService.processActionAnonymous({
                linkId: params.linkId,
                actionType: params.actionType,
                actionId: undefined,
                walletAddress: params.walletAddress,
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

    const mutation = useMutation({
        mutationFn: (params: AnonymousActionParams) => {
            if (identity && Principal.anonymous() !== identity.getPrincipal()) {
                throw new Error("Anonymous user cannot create action");
            }

            const linkService = new LinkService(identity);

            return linkService.processActionAnonymous({
                linkId: params.linkId,
                actionType: params.actionType,
                actionId: params.actionId,
                walletAddress: params.walletAddress,
            });
        },
    });

    return mutation;
}

export function useUpdateAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (vars: UpdateActionInputModel) => {
            const linkService = new LinkService(identity);
            return linkService.updateAction(vars);
        },
    });

    return mutation;
}
