// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LINK_STATE } from "@/services/types/enum";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useProcessAction, useUpdateAction } from "@/hooks/action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import { useLinkMutations } from "@/hooks/useLinkMutations";
import { useInvalidateLinkDetailQueries } from "@/hooks/link-hooks";
import { useLinkCreateValidation } from "@/hooks/form/useLinkCreateValidation";

interface UseCreateConfirmationProps {
    link: LinkDetailModel;
    currentAction: ActionModel | undefined;
    updateInternalAction: (action: ActionModel | undefined) => void;
    onCashierError?: (error: Error) => void;
}

interface UseCreateConfirmationReturn {
    handleSuccessContinue: () => Promise<void>;
    handleConfirmTransaction: () => Promise<void>;
    onActionResult?: (action: ActionModel) => void;
    onCashierError: (error: Error) => void;
}

export const useCreateConfirmation = ({
    link,
    currentAction,
    updateInternalAction,
    onCashierError = () => {},
}: UseCreateConfirmationProps): UseCreateConfirmationReturn => {
    const navigate = useNavigate();

    // Mutation hooks
    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();
    const { callLinkStateMachine } = useLinkMutations();
    const invalidateLinkDetailQueries = useInvalidateLinkDetailQueries();

    // Validation hook
    const { validateLinkPreviewWithBalance } = useLinkCreateValidation();

    /**
     * Processes the create action with the backend
     */
    const handleProcessCreateAction = useCallback(async (): Promise<void> => {
        try {
            if (!currentAction || !link) {
                throw new Error("Action or Link is not defined");
            }

            const validationResult = validateLinkPreviewWithBalance(link, {
                maxActionNumber: link.maxActionNumber,
                includeLinkCreationFee: true, // Include creation fee for processing existing actions
            });
            if (!validationResult.isValid) {
                const msg = validationResult.errors
                    .map((error: { message: string }) => error.message)
                    .join(", ");
                throw new Error(msg);
            }

            const firstUpdatedAction = await processAction({
                actionId: currentAction.id,
                linkId: link.id,
                actionType: currentAction.type,
            });

            updateInternalAction(firstUpdatedAction);

            if (firstUpdatedAction) {
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
                        updateInternalAction(secondUpdatedAction);

                        // Invalidate cache to ensure all components see the updated action
                        if (link?.id) {
                            invalidateLinkDetailQueries(link.id);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error in handleProcessCreateAction:", error);
            throw error;
        }
    }, [
        currentAction,
        link,
        validateLinkPreviewWithBalance,
        processAction,
        updateInternalAction,
        icrc112Execute,
        updateAction,
        invalidateLinkDetailQueries,
    ]);

    /**
     * Sets the link to active state after successful creation
     */
    const handleSetLinkToActive = useCallback(async () => {
        if (!link) throw new Error("Link is not defined");

        const res = await callLinkStateMachine({
            linkId: link.id,
            linkModel: {},
            isContinue: true,
        });

        if (res.state === LINK_STATE.ACTIVE) {
            navigate(`/details/${link.id}`);
        }
    }, [link, callLinkStateMachine, navigate]);

    /**
     * Handles successful creation continuation - sets link to active
     */
    const handleSuccessContinue = useCallback(async () => {
        await handleSetLinkToActive();
    }, [handleSetLinkToActive]);

    /**
     * Starts the creation transaction process
     */
    const handleConfirmTransaction = useCallback(async () => {
        await handleProcessCreateAction();
    }, [handleProcessCreateAction]);

    /**
     * Handles action result updates (optional for create confirmation)
     */
    const onActionResult = useMemo(
        () => (action: ActionModel) => {
            updateInternalAction(action);
        },
        [updateInternalAction],
    );

    /**
     * Passes through the error handler from props
     */
    const handleCashierError = useMemo(
        () => (error: Error) => {
            onCashierError(error);
        },
        [onCashierError],
    );

    return {
        handleSuccessContinue,
        handleConfirmTransaction,
        onActionResult,
        onCashierError: handleCashierError,
    };
};
