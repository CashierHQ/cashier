import { queryKeys } from "@/lib/queryKeys";
import LinkService from "@/services/link.service";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { QueryClient, useMutation, UseMutationResult } from "@tanstack/react-query";
import { LinkDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { ACTION_TYPE } from "@/services/types/enum";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: LinkDetailModel;
    isContinue: boolean;
}

export const useUpdateLink = (
    queryClient: QueryClient,
    identity: Identity | PartialIdentity | undefined,
): UseMutationResult<LinkDto, Error, UpdateLinkParams, unknown> =>
    useMutation({
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

export interface CreateActionParams {
    linkId: string;
}

export function useCreateAction(
    queryClient: QueryClient,
    identity: Identity | PartialIdentity | undefined,
) {
    return useMutation({
        mutationFn: (data: CreateActionParams) => {
            const linkService = new LinkService(identity);

            return linkService.createAction({ ...data, actionType: ACTION_TYPE.CREATE_LINK });
        },
    });
}
