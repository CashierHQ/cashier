import { queryKeys } from "@/lib/queryKeys";
import LinkService, {
    CreateActionInputModel,
    UpdateActionInputModel,
} from "@/services/link.service";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useIdentity } from "@nfid/identitykit/react";
import { ACTION_STATE, ACTION_TYPE } from "@/services/types/enum";
import CallSignerService from "@/services/signerService/callSigner.service";
import { Icrc112RequestModel } from "@/services/types/transaction.service.types";
import { useEffect } from "react";
import { ShowToastFn } from "./useToast";
import { TFunction } from "i18next";
import { ActionModel } from "@/services/types/action.service.types";
import { SequenceRequest } from "@/services/signerService/icrc112.service";

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

export function useCreateAction(actionType?: ACTION_TYPE) {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: (vars: { linkId: string }) => {
            const linkService = new LinkService(identity);
            return linkService.processAction({
                linkId: vars.linkId,
                actionType: actionType ?? ACTION_TYPE.CREATE_LINK,
                actionId: undefined,
            });
        },
    });

    return mutation;
}

export function useCreateActionAnonymous(actionType?: ACTION_TYPE) {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async (vars: { linkId: string; walletAddress: string }) => {
            const linkService = new LinkService(identity);

            return linkService.processActionAnonymous({
                linkId: vars.linkId,
                actionType: actionType ?? ACTION_TYPE.CREATE_LINK,
                actionId: undefined,
                walletAddress: vars.walletAddress,
            });
        },
    });

    return mutation;
}

export function useProcessActionAnonymous(actionType?: ACTION_TYPE) {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async (vars: { actionId: string; linkId: string; walletAddress: string }) => {
            const linkService = new LinkService(identity);

            return linkService.processActionAnonymous({
                linkId: vars.linkId,
                actionType: actionType ?? ACTION_TYPE.CREATE_LINK,
                actionId: vars.actionId,
                walletAddress: vars.walletAddress,
            });
        },
    });

    return mutation;
}

export function useIcrc112Execute() {
    const identity = useIdentity();

    const mutation = useMutation({
        mutationFn: async ({
            transactions,
        }: {
            transactions: Icrc112RequestModel[][] | undefined;
        }) => {
            const identityProvided = !!identity;
            const transactionsProvided = transactions && transactions.length > 0;

            if (!identityProvided || !transactionsProvided) {
                return;
            }

            const signerService = new CallSignerService(identity);

            return await signerService.execute(transactions as unknown as SequenceRequest);
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

export function useFeePreview(linkId: string | undefined) {
    const identity = useIdentity();

    const query = useQuery({
        queryKey: queryKeys.links.feePreview(linkId, identity).queryKey,
        queryFn: async () => {
            if (!linkId || !identity) return [];
            const linkService = new LinkService(identity);
            return linkService.getFeePreview(linkId);
        },
        enabled: !!linkId && !!identity,
        refetchOnWindowFocus: false,
    });

    return query;
}
