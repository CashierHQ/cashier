import { queryKeys } from "@/lib/queryKeys";
import LinkService from "@/services/link.service";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { QueryClient, useMutation, UseMutationResult } from "@tanstack/react-query";
import { Link } from "../../../declarations/cashier_backend/cashier_backend.did";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: LinkDetailModel;
    isContinue: boolean;
}

export const useUpdateLink = (
    queryClient: QueryClient,
    identity: Identity | PartialIdentity | undefined,
): UseMutationResult<Link, Error, UpdateLinkParams, unknown> =>
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
