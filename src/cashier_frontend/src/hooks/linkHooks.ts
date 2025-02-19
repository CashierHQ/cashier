import { queryKeys } from "@/lib/queryKeys";
import LinkService, {
    CreateActionInputModel,
    UpdateActionInputModel,
} from "@/services/link.service";
import { LinkDetailModel, State } from "@/services/types/link.service.types";
import { QueryClient, useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import { ACTION_STATE, ACTION_TYPE, LINK_TYPE } from "@/services/types/enum";
import { MapLinkToLinkDetailModel } from "@/services/types/mapper/link.service.mapper";
import SignerService from "@/services/signer.service";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import { useEffect } from "react";
import { ShowToastFn } from "./useToast";
import { TFunction } from "i18next";
import { ActionModel } from "@/services/types/action.service.types";
import { Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { LinkDto } from "../../../declarations/cashier_backend/cashier_backend.did";

export interface UpdateLinkParams {
    linkId: string;
    linkModel: LinkDetailModel;
    isContinue: boolean;
}

export function useUpdateLink(
    queryClient: QueryClient,
    identity: Identity | PartialIdentity | undefined,
): UseMutationResult<LinkDto, Error, UpdateLinkParams, unknown> {
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
}

export function useUpdateLinkSelfContained() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: UpdateLinkParams) => {
            const linkService = new LinkService(identity);

            const linkDto = await linkService.updateLink(
                data.linkId,
                data.linkModel,
                data.isContinue,
            );

            return MapLinkToLinkDetailModel(linkDto);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.links.list(identity).queryKey });
        },
    });

    return mutation;
}

export function useSetLinkTemplate() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (vars: {
            link: LinkDetailModel;
            patch: { title: string; linkType: LINK_TYPE; description: string };
        }) => {
            const linkService = new LinkService(identity);

            const linkData = {
                ...vars.link,
                ...vars.patch,
                state: State.PendingDetail,
            } as LinkDetailModel;

            const linkDto = await linkService.updateLink(vars.link.id, linkData, true);

            return MapLinkToLinkDetailModel(linkDto);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.links.list(identity).queryKey });
        },
        onError: (e, vars) => {
            console.error("error setting link template", vars.link, vars.patch);
        },
    });

    return mutation;
}

export function useSetTipLinkDetails() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (vars: {
            link: LinkDetailModel;
            patch: { amount: bigint; tokenAddress: string };
        }) => {
            const linkService = new LinkService(identity);

            const linkData = {
                ...vars.link,
                ...vars.patch,
                state: State.PendingPreview,
            } as LinkDetailModel;

            const linkDto = await linkService.updateLink(vars.link.id, linkData, true);

            return MapLinkToLinkDetailModel(linkDto);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.links.list(identity).queryKey });
        },
    });

    return mutation;
}

export function useSetLinkActive() {
    const identity = useIdentity();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (vars: { link: LinkDetailModel }) => {
            const linkService = new LinkService(identity);

            const linkData = {
                ...vars.link,
                state: State.Active,
            } as LinkDetailModel;

            const linkDto = await linkService.updateLink(vars.link.id, linkData, true);

            return MapLinkToLinkDetailModel(linkDto);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.links.list(identity).queryKey });
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

export function useProcessAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (variables: CreateActionInputModel) => {
            const linkService = new LinkService(identity);

            return linkService.processAction(variables);
        },
    });

    return mutation;
}

export function useCreateAction() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (vars: { linkId: string }) => {
            const linkService = new LinkService(identity);

            return linkService.processAction({
                ...vars,
                actionType: ACTION_TYPE.CREATE_LINK,
                actionId: undefined,
            });
        },
    });

    return mutation;
}

export function useIcrcxExecute() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async (transactions: Icrc112RequestModel[][] | undefined) => {
            const identityProvided = !!identity;
            const transactionsProvided = transactions && transactions.length > 0;

            if (!identityProvided || !transactionsProvided) {
                return;
            }

            const signerService = new SignerService(identity);

            return signerService.icrcxExecute(transactions);
        },
    });

    return mutation;
}

export function useTransactionResultToast(
    action: ActionModel,
    showToast: ShowToastFn,
    t: TFunction,
) {
    useEffect(() => {
        if (action) {
            if (action.state === ACTION_STATE.SUCCESS) {
                showToast(
                    t("transaction.confirm_popup.transaction_success"),
                    t("transaction.confirm_popup.transaction_success_message"),
                    "default",
                );
            }

            if (action.state === ACTION_STATE.FAIL) {
                showToast(
                    t("transaction.confirm_popup.transaction_failed"),
                    t("transaction.validation.transaction_failed_message"),
                    "error",
                );
            }
        }
    }, [action]);
}
