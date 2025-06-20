// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

// Removed MultiStepForm context
import { LinkDetailModel, LinkGetUserStateOutputModel } from "@/services/types/link.service.types";
import { FC, useCallback, useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { fetchLinkUserState, useUpdateLinkUserState } from "@/hooks/linkUserHooks";
import { ACTION_TYPE, LINK_USER_STATE, ACTION_STATE, LINK_TYPE } from "@/services/types/enum";
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
import { UseSchema } from ".";
import { useLinkUsageValidation } from "@/hooks/form/useLinkUsageValidation";
import { isReceiveLinkType } from "@/utils/link-type.utils";
import UseLinkForm from "@/components/claim-page/use-link-form";

type UseFormPageProps = {
    form: UseFormReturn<z.infer<typeof UseSchema>>;
    linkData?: LinkDetailModel;
    linkUserState?: LinkGetUserStateOutputModel;
    refetchLinkUserState: () => Promise<void>;
    refetchLinkDetail: () => Promise<void>;
    onCashierError: (error: Error) => void;
    onActionResult: (action: ActionModel) => void;
    onBack?: () => void;
    isFetching?: boolean;
};

export const ChooseWallet: FC<UseFormPageProps> = ({
    form,
    linkData,
    onCashierError = () => {},
    refetchLinkUserState,
    refetchLinkDetail,
    onActionResult,
    onBack,
    linkUserState,
    isFetching,
}) => {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { t } = useTranslation();
    const { goToComplete } = useLinkUseNavigation(linkId);
    const { validateAssetAndFees } = useLinkUsageValidation();

    // UI state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
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
    const { action, link, anonymousWalletAddress, setAnonymousWalletAddress } = useLinkAction(
        linkId,
        ACTION_TYPE.USE_LINK,
    );

    // Removed duplicate useLinkUserState hook as it's now passed from parent

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

    useEffect(() => {
        console.log("useLinkButton state updated:", useLinkButton);
    }, [useLinkButton]);

    // Show confirmation drawer when action is available only after initial loading
    useEffect(() => {
        if (linkUserState?.action && !manuallyClosedDrawer) {
            setShowConfirmation(true);
        }
    }, [linkUserState?.action, link, manuallyClosedDrawer]);

    // Update button state based on parent's loading state
    useEffect(() => {
        setUseLinkButton((prev) => ({
            ...prev,
            disabled: !!isFetching,
        }));
    }, [isFetching]);

    // Polling effect to update action state during processing
    useEffect(() => {
        let intervalId: number | null = null;

        if (isProcessing) {
            intervalId = setInterval(async () => {
                await refetchLinkUserState();
            }, 500);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isProcessing]);

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
     * Initiates the process of using a link, including validation and action creation.
     *
     * @param {string} anonymousWalletAddress - The wallet address for anonymous users
     */
    const initiateUseLinkAction = async (anonymousWalletAddress?: string) => {
        // Don't proceed if initial data is still loading
        if (isFetching || !link) {
            return;
        }

        if (!identity) {
            // If no identity is available, we cannot proceed
            toast.error(t("link_detail.error.use_without_login_or_wallet"));
            return;
        }

        try {
            // Validation for send-type links to ensure sufficient balance
            if (isReceiveLinkType(link.linkType as LINK_TYPE)) {
                const validationResult = await validateAssetAndFees(link);
                if (!validationResult.isValid) {
                    const msg = validationResult.errors.map((error) => error.message).join(", ");
                    throw new Error(msg);
                }
            }
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
                    // If use is already complete, navigate to complete page
                    goToComplete();
                } else {
                    // Show confirmation for existing action
                    setAnonymousWalletAddress(anonymousWalletAddress);
                    await refetchLinkUserState();
                    setShowConfirmation(true);
                }
            } else {
                toast.error(t("link_detail.error.use_without_login_or_wallet"));
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
     * Processes the use action with the backend
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
     */
    const startTransaction = async () => {
        try {
            // Validation for send-type links to ensure sufficient balance
            if (isReceiveLinkType(link!.linkType as LINK_TYPE)) {
                const validationResult = validateAssetAndFees(link!);
                if (!validationResult.isValid) {
                    const msg = validationResult.errors.map((error) => error.message).join(", ");
                    throw new Error(msg);
                }
            }
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
            const result = await updateLinkUserState.mutateAsync({
                input: {
                    action_type: ACTION_TYPE.USE_LINK,
                    link_id: linkId ?? "",
                    isContinue: true,
                    anonymous_wallet_address: anonymousWalletAddress,
                },
            });

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
        }
    };

    return (
        <>
            <div className="w-full h-full flex flex-grow flex-col">
                <UseLinkForm
                    form={form}
                    formData={linkData ?? ({} as LinkDetailModel)}
                    onSubmit={initiateUseLinkAction}
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
                action={action}
                onClose={() => {
                    setShowConfirmation(false);
                    setManuallyClosedDrawer(true);
                }}
                onInfoClick={() => setShowInfo(true)}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                handleSuccessContinue={handleUpdateLinkUserState}
                handleConfirmTransaction={startTransaction}
            />
        </>
    );
};
