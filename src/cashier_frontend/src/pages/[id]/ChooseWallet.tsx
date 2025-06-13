// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import ClaimPageForm from "@/components/claim-page/claim-page-form";
// Removed MultiStepForm context
import { LinkDetailModel, LinkGetUserStateOutputModel } from "@/services/types/link.service.types";
import { FC, useCallback, useEffect, useState } from "react";
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
import { useLinkAction } from "@/hooks/useLinkAction";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import { toast } from "sonner";

import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";

/**
 * Determines button text and state based on action state.
 *
 * @param action The current action model (if available)
 * @param t Translation function
 * @returns Object with text and disabled state for the button
 */
const getDrawerButtonMessage = (
    action: ActionModel | undefined,
    t: (key: string) => string,
): { text: string; disabled: boolean } => {
    if (!action) {
        return { text: t("confirmation_drawer.confirm_button"), disabled: false };
    }

    console.log("getDrawerButtonMessage called with action:", action);

    switch (action.state) {
        case ACTION_STATE.CREATED:
            return { text: t("confirmation_drawer.confirm_button"), disabled: false };
        case ACTION_STATE.SUCCESS:
            return { text: t("continue"), disabled: false };
        case ACTION_STATE.PROCESSING:
            return { text: t("confirmation_drawer.inprogress_button"), disabled: true };
        case ACTION_STATE.FAIL:
            return { text: t("retry"), disabled: false };
    }
};

type ClaimFormPageProps = {
    form: UseFormReturn<z.infer<typeof ClaimSchema>>;
    linkData?: LinkDetailModel;
    refetchLinkUserState: () => Promise<{ data?: LinkGetUserStateOutputModel }>;
    refetchLinkDetail: () => Promise<void>;
    onCashierError: (error: Error) => void;
    onActionResult: (action: ActionModel) => void;
    onBack?: () => void;
};

export const ChooseWallet: FC<ClaimFormPageProps> = ({
    form,
    linkData,
    onCashierError = () => {},
    refetchLinkDetail,
    onActionResult,
    onBack,
}) => {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { t } = useTranslation();
    const { goToComplete } = useLinkUseNavigation(linkId);

    // UI state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    // State to track if when the tx is success -> user is continuing to next page
    const [isCallStateMachine, setIsCallStateMachine] = useState(false);
    const [manuallyClosedDrawer, setManuallyClosedDrawer] = useState(false);

    // Button state for confirmation drawer

    // Hooks
    const { mutateAsync: createAction } = useCreateAction();
    const { mutateAsync: createActionAnonymous } = useCreateActionAnonymous();
    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: processActionAnonymous } = useProcessActionAnonymous();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();
    const updateLinkUserState = useUpdateLinkUserState();

    // Access link data from props instead of fetching directly
    const { link, setAction, anonymousWalletAddress, setAnonymousWalletAddress } = useLinkAction(
        linkId,
        ACTION_TYPE.USE_LINK,
    );

    const enableLocalFetch = !!linkId && !!identity;

    const {
        data: linkUserState,
        refetch: refetchLinkUserState,
        isFetching,
    } = useLinkUserState(
        {
            action_type: ACTION_TYPE.USE_LINK,
            link_id: linkId ?? "",
        },
        enableLocalFetch,
    );

    const enhancedRefresh = async () => {
        try {
            const userStateResult = await refetchLinkUserState();
            if (refetchLinkDetail) {
                try {
                    // Explicitly pass the current linkId to make sure it's using the right value
                    await refetchLinkDetail();
                } catch (detailError) {
                    console.error("Error in refetchLinkDetail for linkId ${linkId}:", detailError);
                }
            }
            return userStateResult;
        } catch (error) {
            console.error("Error in enhanced refresh:", error);
            throw error;
        }
    };

    const [useLinkButton, setUseLinkButton] = useState<{
        text: string;
        disabled: boolean;
    }>({
        text: t("confirmation_drawer.confirm_button"),
        disabled: false,
    });
    const [drawerConfirmButton, setDrawerConfirmButton] = useState<{
        text: string;
        disabled: boolean;
    }>({
        text: isFetching ? "Loading..." : t("confirmation_drawer.confirm_button"),
        disabled: false,
    });

    // Update button text based on action state and processing state
    useEffect(() => {
        // If we're actively processing, show "Processing..." regardless of action state

        if (isProcessing || isCallStateMachine) {
            setDrawerConfirmButton({
                text: t("confirmation_drawer.inprogress_button"),
                disabled: true,
            });
            return;
        }

        // If we have an action, use its state to determine button text
        if (linkUserState?.action) {
            const confirmButton = getDrawerButtonMessage(linkUserState.action, t);
            setDrawerConfirmButton(confirmButton);
            return;
        }

        // Default state when not processing and no action
        setDrawerConfirmButton({
            text: t("confirmation_drawer.confirm_button"),
            disabled: false,
        });
    }, [linkUserState, isProcessing, linkData, isFetching, t]);

    // Show confirmation drawer when action is available only after initial loading
    useEffect(() => {
        if (linkUserState?.action && !manuallyClosedDrawer) {
            setShowConfirmation(true);
        }
    }, [linkUserState?.action, link, manuallyClosedDrawer]);

    // Fetch action data when identity changes or link ID changes
    useEffect(() => {
        const fetchInitialData = async () => {
            setUseLinkButton({
                text: useLinkButton.text,
                disabled: true, // Disable button while loading
            });
            if (linkId) {
                try {
                    await refetchLinkUserState();
                } catch (error) {
                    console.error("Error fetching action:", error);
                } finally {
                    console.log("Initial data fetch complete for linkId:", linkId);
                    setUseLinkButton({
                        text: useLinkButton.text,
                        disabled: false, // Enable button after loading
                    });
                }
            } else {
                setUseLinkButton({
                    text: useLinkButton.text,
                    disabled: false, // Enable button if no linkId
                });
            }
        };

        fetchInitialData();
        // Only depend on identity changes, linkId changes, or parent state changes
        // Explicitly NOT depending on refetchLinkUserState to avoid infinite loops
    }, [identity, linkId]);

    // Polling effect to update action state during processing
    useEffect(() => {
        let intervalId: number | null = null;

        if (isProcessing) {
            intervalId = setInterval(async () => {
                const res = await refetchLinkUserState();
                if (res?.data?.action) {
                    setAction(res.data.action);
                }
            }, 2000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isProcessing, linkId, refetchLinkUserState, t]);

    /**
     * Creates an action for authenticated users
     */
    const handleCreateActionForUser = async (): Promise<ActionModel> => {
        if (linkUserState?.action) {
            return linkUserState.action;
        }

        return await createAction({
            linkId: linkId!,
            actionType: ACTION_TYPE.USE_LINK,
        });
    };

    /**
     * Creates an action for anonymous users
     */
    const handleCreateActionAnonymous = async (walletAddress: string): Promise<ActionModel> => {
        return await createActionAnonymous({
            linkId: linkId!,
            walletAddress: walletAddress,
            actionType: ACTION_TYPE.USE_LINK,
        });
    };

    /**
     * Handles the form submission process for claiming a link.
     *
     * @param {string} anonymousWalletAddress - The wallet address for anonymous users
     */
    const handleCreateAction = async (anonymousWalletAddress?: string) => {
        // Don't proceed if initial data is still loading
        if (isFetching) {
            return;
        }

        // Validation

        try {
            setUseLinkButton({
                text: useLinkButton.text,
                disabled: true,
            });

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
                        action_type: ACTION_TYPE.USE_LINK,
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
                            action_type: ACTION_TYPE.USE_LINK,
                            link_id: linkId ?? "",
                            anonymous_wallet_address: anonymousWalletAddress,
                        },
                        identity,
                    );
                    setShowConfirmation(true);
                } else if (anonymousLinkUserState.link_user_state === LINK_USER_STATE.COMPLETE) {
                    // If claim is already complete, navigate to complete page
                    goToComplete();
                } else {
                    // Show confirmation for existing action
                    setAnonymousWalletAddress(anonymousWalletAddress);
                    await refetchLinkUserState();
                    setShowConfirmation(true);
                }
            } else {
                toast.error(t("link_detail.error.claim_without_login_or_wallet"));
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }
        } finally {
            setUseLinkButton({
                text: useLinkButton.text,
                disabled: false, // Disable button while loading
            });
        }
    };

    /**
     * Processes the claim action with the backend
     */
    const handleProcessUseAction = async () => {
        if (!link) throw new Error("Link is not defined");
        if (!linkUserState?.action) throw new Error("Action is not defined");

        const action = linkUserState.action;

        if (identity) {
            // Process action for authenticated user
            const linkId = link.id;
            if (!linkId) throw new Error("Link ID is not defined");

            // Step 1: Process the action
            const processActionResult = await processAction({
                linkId: linkId,
                actionType: action?.type ?? ACTION_TYPE.USE_LINK,
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
                        if (onActionResult) onActionResult(secondUpdatedAction);
                    }

                    if (secondUpdatedAction.state === ACTION_STATE.SUCCESS) {
                        setIsProcessing(false);
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
                actionType: ACTION_TYPE.USE_LINK,
            });

            if (processActionResult) {
                await refetchLinkUserState();

                if (onActionResult) onActionResult(processActionResult);
            }
        }
    };

    /**
     * Main transaction handler - called by the confirmation drawer
     */
    const startTransaction = async () => {
        try {
            setIsProcessing(true);
            await handleProcessUseAction();
        } catch (error) {
            console.error("Transaction error:", error);
            if (isCashierError(error)) {
                onCashierError(error);
            }
        } finally {
            setIsProcessing(false);

            // Perform a comprehensive data refresh with enhanced logging
            try {
                await enhancedRefresh();

                // Force parent component to re-render with fresh data by calling refetchLinkDetail
                if (refetchLinkDetail) {
                    await refetchLinkDetail();

                    // Wait a moment and trigger another refresh to ensure UI updates
                    setTimeout(async () => {
                        try {
                            await refetchLinkDetail();
                        } catch (delayedError) {
                            console.error("Error in delayed verification refresh:", delayedError);
                        }
                    }, 1000);
                } else {
                }
            } catch (finallyError) {
                console.error("Error during data refresh operations:", finallyError);
            }
        }
    };

    /**
     * Updates link user state after successful transaction
     */ const handleUpdateLinkUserState = async () => {
        try {
            setIsCallStateMachine(true);
            setDrawerConfirmButton({
                text: t("confirmation_drawer.inprogress_button"),
                disabled: true,
            });

            const result = await updateLinkUserState.mutateAsync({
                input: {
                    action_type: ACTION_TYPE.USE_LINK,
                    link_id: linkId ?? "",
                    isContinue: true,
                    anonymous_wallet_address: anonymousWalletAddress,
                },
            });

            console.log("Link user state updated successfully:", result);

            // Perform a comprehensive data refresh with enhanced logging
            try {
                await enhancedRefresh();

                // Make multiple explicit calls to refetchLinkDetail to ensure parent component updates
                if (refetchLinkDetail) {
                    await refetchLinkDetail();
                } else {
                }
            } catch (refreshError) {
                console.error("Error during comprehensive data refresh:", refreshError);
            }

            if (result.link_user_state === LINK_USER_STATE.COMPLETE) {
                // Allow time for data to refresh before navigation
                setTimeout(() => {
                    goToComplete({ replace: true });
                }, 500);
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error);
            }
        } finally {
            setIsCallStateMachine(false);
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
                    isDisabled={useLinkButton.disabled}
                    setDisabled={useCallback((disabled: boolean) => {
                        setUseLinkButton((prev) => ({
                            ...prev,
                            disabled: disabled,
                        }));
                    }, [])}
                    buttonText={useLinkButton.text || t("confirmation_drawer.confirm_button")}
                />
            </div>

            <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

            <ConfirmationDrawerV2
                open={showConfirmation && !showInfo}
                action={linkUserState?.action}
                onClose={() => {
                    setShowConfirmation(false);
                    setManuallyClosedDrawer(true);
                }}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                onSuccessContinue={handleUpdateLinkUserState}
                startTransaction={startTransaction}
                isButtonDisabled={drawerConfirmButton.disabled}
                setButtonDisabled={useCallback((disabled: boolean) => {
                    setDrawerConfirmButton((prev) => ({
                        ...prev,
                        disabled: disabled,
                    }));
                }, [])}
                buttonText={drawerConfirmButton.text}
                setButtonText={useCallback((text: string) => {
                    setDrawerConfirmButton((prev) => ({
                        ...prev,
                        text: text,
                    }));
                }, [])}
            />
        </>
    );
};
