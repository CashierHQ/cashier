import { useMutation } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import LinkService from "@/services/link.service";
import { ACTION_TYPE } from "@/services/types/enum";

/**
 * Hook for creating a new action for a link
 * @param actionType Optional action type, defaults to CREATE_LINK
 * @returns Mutation for creating an action
 */
export function useCreateAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (vars: { linkId: string; actionId?: string; actionType: ACTION_TYPE }) => {
            const linkService = new LinkService(identity);
            return linkService.processAction({
                linkId: vars.linkId,
                actionType: vars.actionType,
                actionId: vars.actionId,
            });
        },
    });

    return mutation;
}
