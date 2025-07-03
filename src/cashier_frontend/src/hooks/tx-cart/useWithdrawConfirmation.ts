// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ACTION_TYPE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useProcessAction, useUpdateAction } from "@/hooks/action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import { useLinkMutations } from "@/hooks/useLinkMutations";
import { usePollingLinkAndAction } from "@/hooks/polling/usePollingLinkAndAction";
import { Identity } from "@dfinity/agent";

interface UseWithdrawConfirmationProps {
    linkId: string;
    link: LinkDetailModel;
    currentAction: ActionModel | undefined;
    setCurrentAction: (action: ActionModel | undefined) => void;
    identity: Identity | null | undefined;
    refetchLinkDetail: () => Promise<unknown>;
    setShowConfirmationDrawer: (show: boolean) => void;
}

interface UseWithdrawConfirmationReturn {
    handleSuccessContinue: () => Promise<void>;
    handleConfirmTransaction: () => Promise<void>;
    onActionResult: (action: ActionModel) => void;
    onCashierError: (error: Error) => void;
}

export const useWithdrawConfirmation = ({
    linkId,
    link,
    currentAction,
    setCurrentAction,
    identity,
    refetchLinkDetail,
    setShowConfirmationDrawer,
}: UseWithdrawConfirmationProps): UseWithdrawConfirmationReturn => {
    const { t } = useTranslation();

    // Mutation hooks
    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();
    const { callLinkStateMachine } = useLinkMutations();

    // Polling hook for tracking action state during withdrawal
    const { startPollingLinkDetail, stopPolling } = usePollingLinkAndAction({
        onUpdate: (action: ActionModel) => {
            setCurrentAction(action);
        },
        onError: (error: Error) => {
            console.error("Polling error:", error);
        },
    });

    /**
     * Processes the withdrawal transaction
     */
    const handleWithdrawProcess = useCallback(async () => {
        try {
            if (!link) throw new Error("Link is not defined");
            if (!currentAction) throw new Error("Action is not defined");

            // Start polling to track action state changes
            startPollingLinkDetail(linkId, ACTION_TYPE.WITHDRAW_LINK, identity || undefined);

            const firstUpdatedAction = await processAction({
                linkId: link.id,
                actionType: ACTION_TYPE.WITHDRAW_LINK,
                actionId: currentAction.id,
            });

            // Update local action state with enriched action
            if (firstUpdatedAction.icrc112Requests) {
                setCurrentAction(firstUpdatedAction);

                const response = await icrc112Execute({
                    transactions: firstUpdatedAction.icrc112Requests,
                });

                if (response) {
                    const secondUpdatedAction = await updateAction({
                        actionId: currentAction.id,
                        linkId: link.id,
                        external: true,
                    });

                    if (secondUpdatedAction) {
                        setCurrentAction(secondUpdatedAction);
                    }
                }
            }
        } catch (error) {
            console.error("Error in withdrawal process:", error);
            throw error;
        } finally {
            // Stop polling when process is complete
            stopPolling();
        }
    }, [
        link,
        currentAction,
        linkId,
        identity,
        processAction,
        updateAction,
        icrc112Execute,
        setCurrentAction,
        startPollingLinkDetail,
        stopPolling,
    ]);

    /**
     * Sets the link to inactive ended state after successful withdrawal
     */
    const setInactiveEndedLink = useCallback(async () => {
        try {
            if (!link) throw new Error("Link data is not available");

            const res = await callLinkStateMachine({
                linkId: link.id,
                linkModel: {},
                isContinue: true,
            });
            console.log("Link state machine response:", res);

            await refetchLinkDetail();
            setShowConfirmationDrawer(false);
        } catch (error) {
            console.error("Error setting link inactive:", error);
            throw error;
        }
    }, [link, callLinkStateMachine, refetchLinkDetail, setShowConfirmationDrawer]);

    /**
     * Handles successful withdrawal continuation
     */
    const handleSuccessContinue = useCallback(async () => {
        await setInactiveEndedLink();
    }, [setInactiveEndedLink]);

    /**
     * Starts the withdrawal transaction process
     */
    const handleConfirmTransaction = useCallback(async () => {
        await handleWithdrawProcess();
    }, [handleWithdrawProcess]);

    /**
     * Handles action result updates
     */
    const onActionResult = useMemo(
        () => (actionResult: ActionModel) => {
            setCurrentAction(actionResult);
        },
        [setCurrentAction],
    );

    /**
     * Handles cashier errors with toast notifications and closes confirmation drawer
     */
    const onCashierError = useMemo(
        () => (error: Error) => {
            toast.error(t("common.error"), {
                description: error.message,
            });
            console.error("Cashier error:", error);
            setShowConfirmationDrawer(false);
        },
        [t, setShowConfirmationDrawer],
    );

    return {
        handleSuccessContinue,
        handleConfirmTransaction,
        onActionResult,
        onCashierError,
    };
};
