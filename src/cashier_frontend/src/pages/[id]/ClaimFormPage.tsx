import ClaimPageForm from "@/components/claim-page/claim-page-form";
import { useMultiStepFormContext } from "@/contexts/multistep-form-context";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { FC, useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { ClaimSchema } from ".";
import { z } from "zod";
import {
    fetchLinkUserState,
    useLinkUserState,
    useUpdateLinkUserState,
} from "@/hooks/linkUserHooks";
import { ACTION_TYPE, LINK_USER_STATE, ACTION_STATE } from "@/services/types/enum";
import { useParams } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { ActionModel } from "@/services/types/action.service.types";
import { isCashierError } from "@/services/errorProcess.service";
import { useTranslation } from "react-i18next";
import {
    useCreateAction,
    useCreateActionAnonymous,
    useProcessAction,
    useProcessActionAnonymous,
    useUpdateAction,
} from "@/hooks/action-hooks";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";

type ClaimFormPageProps = {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    onSubmit: () => void;
    linkData?: LinkDetailModel;
    onCashierError?: (error: Error) => void;
    onActionResult?: (action: ActionModel) => void;
    onBack?: () => void;
};

export const ClaimFormPage: FC<ClaimFormPageProps> = ({
    form,
    linkData,
    onCashierError = () => {},
    onActionResult,
    onSubmit,
    onBack,
}) => {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { t } = useTranslation();
    const { nextStep } = useMultiStepFormContext();

    // UI state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isDisabledButton, setIsDisabledButton] = useState(false);
    const [buttonText, setButtonText] = useState(t("claim.claim"));
    const [isProcessing, setIsProcessing] = useState(false);
    const [isInitialDataLoading, setIsInitialDataLoading] = useState(true);

    // Button state for confirmation drawer
    const [confirmButtonDisabled, setConfirmButtonDisabled] = useState(false);
    const [confirmButtonText, setConfirmButtonText] = useState("");

    // Hooks
    const { mutateAsync: createAction } = useCreateAction();
    const { mutateAsync: createActionAnonymous } = useCreateActionAnonymous();
    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: processActionAnonymous } = useProcessActionAnonymous();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();
    const updateLinkUserState = useUpdateLinkUserState();

    // Enable fetch when we have a link ID
    const enableFetchLinkUserState = !!linkId && !!identity;

    const { data: linkUserState, refetch: refetchLinkUserState } = useLinkUserState(
        {
            action_type: ACTION_TYPE.CLAIM_LINK,
            link_id: linkId ?? "",
            anonymous_wallet_address: "",
        },
        enableFetchLinkUserState,
    );

    const { link, anonymousWalletAddress, setAnonymousWalletAddress } = useLinkAction(
        linkId,
        ACTION_TYPE.CLAIM_LINK,
    );

    // Update button text based on action state
    useEffect(() => {
        if (!linkUserState?.action) return;

        const actionState = linkUserState.action.state;
        if (actionState === ACTION_STATE.SUCCESS) {
            setConfirmButtonText(t("continue"));
            setConfirmButtonDisabled(false);
        } else if (actionState === ACTION_STATE.PROCESSING) {
            setConfirmButtonText(t("confirmation_drawer.inprogress_button"));
            setConfirmButtonDisabled(true);
        } else if (actionState === ACTION_STATE.FAIL) {
            setConfirmButtonText(t("retry"));
            setConfirmButtonDisabled(false);
        } else {
            setConfirmButtonText(t("confirmation_drawer.confirm_button"));
            setConfirmButtonDisabled(false);
        }
    }, [linkUserState, t]);

    // Show confirmation drawer when action is available only after initial loading
    useEffect(() => {
        console.log("[hook] Link:", link);
        console.log("[hook] Action:", linkUserState?.action);

        if (!isInitialDataLoading && linkUserState?.action) {
            setShowConfirmation(true);
        }
    }, [linkUserState?.action, link, isInitialDataLoading]);

    // Fetch action data when identity changes
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsInitialDataLoading(true);
            // Also disable the button during initial loading
            setIsDisabledButton(true);

            if (linkId && identity) {
                try {
                    await refetchLinkUserState();
                } catch (error) {
                    console.error("Error fetching action:", error);
                } finally {
                    setIsInitialDataLoading(false);
                    // Make sure to re-enable the button after loading
                    setIsDisabledButton(false);
                }
            } else {
                setIsInitialDataLoading(false);
                // Make sure to re-enable the button even when no fetch is needed
                setIsDisabledButton(false);
            }
        };

        fetchInitialData();
    }, [identity, linkId, refetchLinkUserState]);

    // Polling effect to update action state during processing
    useEffect(() => {
        let intervalId: number | null = null;

        console.log("isProcessing changed", isProcessing);

        if (isProcessing) {
            intervalId = setInterval(async () => {
                console.log("link id", linkId);
                console.log("action", linkUserState?.action);
                await refetchLinkUserState().catch((error) => {
                    console.error("Error fetching action:", error);
                });
            }, 2000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isProcessing, linkId, refetchLinkUserState]);

    /**
     * Creates an action for authenticated users
     */
    const handleCreateActionForUser = async (): Promise<ActionModel> => {
        if (linkUserState?.action) {
            return linkUserState.action;
        }

        return await createAction({
            linkId: linkId!,
            actionType: ACTION_TYPE.CLAIM_LINK,
        });
    };

    /**
     * Creates an action for anonymous users
     */
    const handleCreateActionAnonymous = async (walletAddress: string): Promise<ActionModel> => {
        return await createActionAnonymous({
            linkId: linkId!,
            walletAddress: walletAddress,
            actionType: ACTION_TYPE.CLAIM_LINK,
        });
    };

    /**
     * Handles the form submission process for claiming a link.
     *
     * @param {string} anonymousWalletAddress - The wallet address for anonymous users
     */
    const handleCreateAction = async (anonymousWalletAddress?: string) => {
        // Don't proceed if initial data is still loading
        if (isInitialDataLoading) {
            console.log("Initial data still loading, not processing button click");
            return;
        }

        // Validation
        onSubmit();

        try {
            setIsDisabledButton(true);
            setButtonText(t("processing"));

            if (linkUserState?.action) {
                // Display the confirmation drawer if action exists
                setShowConfirmation(true);
            } else if (identity) {
                // Authenticated user flow
                const action = await handleCreateActionForUser();
                if (action) {
                    await refetchLinkUserState();
                    setShowConfirmation(true);
                }
            } else if (anonymousWalletAddress) {
                // Anonymous user flow
                const anonymousLinkUserState = await fetchLinkUserState(
                    {
                        action_type: ACTION_TYPE.CLAIM_LINK,
                        link_id: linkId ?? "",
                        anonymous_wallet_address: anonymousWalletAddress,
                    },
                    identity,
                );

                if (!anonymousLinkUserState.link_user_state) {
                    // Create new action if none exists
                    await handleCreateActionAnonymous(anonymousWalletAddress);
                    setAnonymousWalletAddress(anonymousWalletAddress);
                    // Refetch to get the action
                    await fetchLinkUserState(
                        {
                            action_type: ACTION_TYPE.CLAIM_LINK,
                            link_id: linkId ?? "",
                            anonymous_wallet_address: anonymousWalletAddress,
                        },
                        identity,
                    );
                    setShowConfirmation(true);
                } else if (anonymousLinkUserState.link_user_state === LINK_USER_STATE.COMPLETE) {
                    // If claim is already complete, proceed to next step
                    nextStep();
                } else {
                    // Show confirmation for existing action
                    setAnonymousWalletAddress(anonymousWalletAddress);
                    await refetchLinkUserState();
                    setShowConfirmation(true);
                }
            } else {
                throw new Error("No identity or anonymous wallet address provided");
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }
            console.error("Error in handleSubmit:", error);
        } finally {
            setIsDisabledButton(false);
            setButtonText(t("claim.claim"));
        }
    };

    /**
     * Processes the claim action with the backend
     */
    const handleProcessClaimAction = async () => {
        if (!link) throw new Error("Link is not defined");
        if (!linkUserState?.action) throw new Error("Action is not defined");

        const action = linkUserState.action;

        try {
            setIsProcessing(true);

            if (identity) {
                // Process action for authenticated user
                const linkId = link.id;
                if (!linkId) throw new Error("Link ID is not defined");

                // Step 1: Process the action
                const processActionResult = await processAction({
                    linkId: linkId,
                    actionType: action?.type ?? ACTION_TYPE.CLAIM_LINK,
                    actionId: action.id,
                });

                // Step 2: Execute ICRC-1 transactions if needed
                if (processActionResult.icrc112Requests) {
                    const response = await icrc112Execute({
                        transactions: processActionResult.icrc112Requests,
                    });

                    // Step 3: Update action after external transaction
                    if (response) {
                        const secondUpdatedAction = await updateAction({
                            actionId: action.id,
                            linkId: linkId,
                            external: true,
                        });

                        if (secondUpdatedAction) {
                            await refetchLinkUserState();
                            if (onActionResult) onActionResult(secondUpdatedAction);
                        }
                    }
                }

                if (processActionResult) {
                    await refetchLinkUserState();
                    if (onActionResult) onActionResult(processActionResult);
                }
            } else {
                // Process action for anonymous user
                const processActionResult = await processActionAnonymous({
                    linkId: link!.id,
                    actionId: action!.id,
                    walletAddress: anonymousWalletAddress ?? "",
                    actionType: ACTION_TYPE.CLAIM_LINK,
                });

                if (processActionResult) {
                    await refetchLinkUserState();
                    if (onActionResult) onActionResult(processActionResult);
                }
            }
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Main transaction handler - called by the confirmation drawer
     */
    const startTransaction = async () => {
        try {
            await handleProcessClaimAction();
        } catch (error) {
            console.error("Transaction error:", error);
            if (isCashierError(error)) {
                onCashierError(error);
            }
            throw error;
        }
    };

    /**
     * Updates link user state after successful transaction
     */
    const handleUpdateLinkUserState = async () => {
        const result = await updateLinkUserState.mutateAsync({
            input: {
                action_type: ACTION_TYPE.CLAIM_LINK,
                link_id: linkId ?? "",
                isContinue: true,
                anonymous_wallet_address: anonymousWalletAddress,
            },
        });

        if (result.link_user_state === LINK_USER_STATE.COMPLETE) {
            nextStep();
        }
    };

    return (
        <>
            <div className="w-full h-full flex flex-grow flex-col">
                <ClaimPageForm
                    form={form}
                    formData={linkData ?? ({} as LinkDetailModel)}
                    onSubmit={handleCreateAction}
                    onBack={onBack}
                    isDisabled={isDisabledButton || isInitialDataLoading}
                    setDisabled={setIsDisabledButton}
                    buttonText={isInitialDataLoading ? "Loading..." : buttonText}
                />
            </div>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawerV2
                open={showConfirmation && !showInfo}
                action={linkUserState?.action}
                onClose={() => setShowConfirmation(false)}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                onSuccessContinue={handleUpdateLinkUserState}
                startTransaction={startTransaction}
                isButtonDisabled={confirmButtonDisabled}
                setButtonDisabled={setConfirmButtonDisabled}
                buttonText={confirmButtonText}
                setButtonText={setConfirmButtonText}
            />
        </>
    );
};
