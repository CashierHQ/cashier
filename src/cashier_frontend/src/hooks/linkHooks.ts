import { queryKeys } from "@/lib/queryKeys";
import LinkService from "@/services/link.service";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { LinkDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { ACTION_TYPE } from "@/services/types/enum";
import { useIdentity } from "@nfid/identitykit/react";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: LinkDetailModel;
    isContinue: boolean;
}

export const useUpdateLink = (): UseMutationResult<LinkDto, Error, UpdateLinkParams, unknown> => {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: UpdateLinkParams) => {
            const linkService = new LinkService(identity);
            return linkService.updateLink(data.linkId, data.linkModel, data.isContinue);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.links.list(identity).queryKey });
        },
        onError: (err) => {
            throw err;
        },
    });

    return mutation;
};

export function useCreateAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (linkId: string) => {
            const linkService = new LinkService(identity);

            return linkService.createAction({ linkId, actionType: ACTION_TYPE.CREATE_LINK });
        },
    });

    return mutation;
}

export function useProcessAction() {}
