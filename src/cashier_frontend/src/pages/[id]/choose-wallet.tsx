// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ACTION_TYPE, LINK_STATE, LINK_USER_STATE, LINK_TYPE } from "@/services/types/enum";
import SheetWrapper from "@/components/sheet-wrapper";
import { useLinkUserState, fetchLinkUserState } from "@/hooks/linkUserHooks";
import { isCashierError } from "@/services/errorProcess.service";
import { ActionModel } from "@/services/types/action.service.types";
import { LinkDetailModel } from "@/services/types/link.service.types";
import { useTranslation } from "react-i18next";
import { useLinkUseNavigation } from "@/hooks/useLinkNavigation";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import LinkNotFound from "@/components/link-not-found";
import { useTokens } from "@/hooks/useTokens";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { toast } from "sonner";
import { useIdentity } from "@nfid/identitykit/react";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { FeeInfoDrawer } from "@/components/fee-info-drawer/fee-info-drawer";
import { useLinkUsageValidation } from "@/hooks/form/useLinkUsageValidation";
import { isReceiveLinkType } from "@/utils/link-type.utils";
import UseLinkForm from "@/components/use-page/use-link-form";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useLinkMutations } from "@/hooks/useLinkMutations";
import { useUseConfirmation } from "@/hooks/tx-cart/useUseConfirmation";

export const UseSchema = z.object({
    token: z.string().min(5),
    amount: z.coerce.number().min(1),
    address: z.string().optional(),
});

export default function ChooseWalletPage() {
    const { linkId } = useParams();
    const identity = useIdentity();
    const { t } = useTranslation();
    const { renderSkeleton } = useSkeletonLoading();
    const { updateTokenInit } = useTokens();
    const { goToComplete, handleStateBasedNavigation, goToLinkDefault } =
        useLinkUseNavigation(linkId);
    const { validateAssetAndFees } = useLinkUsageValidation();

    // Form setup
    const form = useForm<z.infer<typeof UseSchema>>({
        resolver: zodResolver(UseSchema),
    });

    // Data fetching with new hooks
    const linkDetailQuery = useLinkDetailQuery(linkId, ACTION_TYPE.USE_LINK);
    const { createAction, createActionAnonymous } = useLinkMutations();

    const link = linkDetailQuery.data?.link;
    const isLoadingLinkData = linkDetailQuery.isLoading;

    const {
        data: linkUserState,
        refetch: refetchLinkUserStateFn,
        isFetching: isUserStateLoading,
    } = useLinkUserState(
        {
            action_type: ACTION_TYPE.USE_LINK,
            link_id: linkId ?? "",
            anonymous_wallet_address: "",
        },
        !!linkId && !!identity,
    );

    const queryAction = linkUserState?.action;

    // ===== INTERNAL ACTION STATE MANAGEMENT =====
    // The action from the query hook is read-only and managed by React Query's cache.
    // When we call mutations like processAction or updateAction, the results don't
    // automatically update the query cache. This internal action state allows us to
    // track action updates independently of the query cache.

    // Internal action state that can be updated independently
    const [internalAction, setInternalAction] = useState<ActionModel | undefined>(queryAction);

    // Debug logging to track action selection
    useEffect(() => {
        console.log("Action State Debug:", {
            hasInternalAction: !!internalAction,
            hasQueryAction: !!queryAction,
            currentActionId: internalAction?.id,
            currentActionState: internalAction?.state,
        });
    }, [internalAction, queryAction, internalAction]);

    // Sync internal action with query action when query action changes
    // This ensures we get the initial action from the query
    useEffect(() => {
        if (queryAction && !internalAction) {
            setInternalAction(queryAction);
        }
    }, [queryAction, internalAction]);

    // Cleanup effect to stop polling when component unmounts or conditions change
    useEffect(() => {
        return () => {
            // Stop polling when component unmounts
            console.log("Component unmounting - stopping action polling");
        };
    }, []);

    // Stop polling if link or action becomes unavailable
    useEffect(() => {
        if (!link || !internalAction) {
            console.log("Link or action unavailable - stopping action polling");
        }
    }, [link, internalAction]);

    // ===== END INTERNAL ACTION STATE MANAGEMENT =====

    // Local state
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [manuallyClosedDrawer, setManuallyClosedDrawer] = useState(false);
    const [anonymousWalletAddress, setAnonymousWalletAddress] = useState<string>("");

    // Use confirmation hook for all confirmation-related methods
    const { handleSuccessContinue, handleConfirmTransaction, onActionResult, onCashierError } =
        useUseConfirmation({
            linkId: linkId ?? "",
            link: link!,
            internalAction,
            setInternalAction,
            anonymousWalletAddress,
            identity,
            refetchLinkUserStateFn,
            linkDetailQuery,
        });

    // Button state
    const [useLinkButton, setUseLinkButton] = useState<{
        text: string;
        disabled: boolean;
    }>({
        text: t("confirmation_drawer.confirm_button"),
        disabled: false,
    });

    // Initialize tokens when link data is available
    useEffect(() => {
        if (link) {
            updateTokenInit();
        }
    }, [link, updateTokenInit]);

    // Handle state-based navigation for logged-in users
    useEffect(() => {
        if (link && identity) {
            handleStateBasedNavigation(linkUserState, true);
        }
    }, [link, linkUserState, identity, handleStateBasedNavigation]);

    // Show confirmation drawer when action is available
    useEffect(() => {
        if (internalAction && !manuallyClosedDrawer) {
            setShowConfirmation(true);
        }
    }, [internalAction, link, manuallyClosedDrawer]);

    // Update button state based on loading state
    useEffect(() => {
        setUseLinkButton((prev) => ({
            ...prev,
            disabled: !!isUserStateLoading,
        }));
    }, [isUserStateLoading]);

    /**
     * Creates an action for authenticated users
     */
    const handleCreateActionForUser = async (): Promise<ActionModel> => {
        if (internalAction) {
            return internalAction;
        }

        const newAction = await createAction({
            linkId: linkId!,
            actionType: ACTION_TYPE.USE_LINK,
        });

        setInternalAction(newAction);
        return newAction;
    };

    /**
     * Creates an action for anonymous users
     */
    const handleCreateActionAnonymous = async (walletAddress: string): Promise<ActionModel> => {
        const newAction = await createActionAnonymous({
            linkId: linkId!,
            walletAddress: walletAddress,
            actionType: ACTION_TYPE.USE_LINK,
        });

        setInternalAction(newAction);
        return newAction;
    };

    /**
     * Initiates the process of using a link
     */
    const initiateUseLinkAction = async (anonymousWalletAddress?: string) => {
        // Don't proceed if initial data is still loading
        if (isUserStateLoading || !link) {
            return;
        }

        if (!identity) {
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

            if (internalAction) {
                setShowConfirmation(true);
            } else if (identity) {
                // Authenticated user flow
                const action = await handleCreateActionForUser();
                if (action) {
                    await refetchLinkUserStateFn();
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
                    await handleCreateActionAnonymous(anonymousWalletAddress);
                    setAnonymousWalletAddress(anonymousWalletAddress);
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
                    goToComplete();
                } else {
                    setAnonymousWalletAddress(anonymousWalletAddress);
                    await refetchLinkUserStateFn();
                    setShowConfirmation(true);
                }
            } else {
                toast.error(t("link_detail.error.use_without_login_or_wallet"));
            }
        } catch (error) {
            if (isCashierError(error)) {
                onCashierError(error as Error);
            }
        } finally {
            setUseLinkButton({
                text: useLinkButton.text,
                disabled: false,
            });
        }
    };

    const memoizedOnBack = useMemo(
        () => () => {
            goToLinkDefault();
        },
        [goToLinkDefault],
    );

    const setDisabled = useCallback((disabled: boolean) => {
        setUseLinkButton((prev) => ({
            ...prev,
            disabled: disabled,
        }));
    }, []);

    // Early return for inactive links
    if (link?.state === LINK_STATE.INACTIVE || link?.state === LINK_STATE.INACTIVE_ENDED) {
        return <LinkNotFound />;
    }

    return (
        <MainAppLayout>
            <SheetWrapper>
                {isLoadingLinkData && !link ? (
                    renderSkeleton()
                ) : (
                    <>
                        <div className="w-full h-full flex flex-grow flex-col">
                            <UseLinkForm
                                form={form}
                                formData={link ?? ({} as LinkDetailModel)}
                                onSubmit={initiateUseLinkAction}
                                onBack={memoizedOnBack}
                                isDisabled={useLinkButton.disabled}
                                setDisabled={setDisabled}
                                buttonText={
                                    useLinkButton.text || t("confirmation_drawer.confirm_button")
                                }
                            />
                        </div>

                        <FeeInfoDrawer open={showInfo} onClose={() => setShowInfo(false)} />

                        <ConfirmationDrawerV2
                            open={showConfirmation && !showInfo}
                            link={link!}
                            action={internalAction}
                            onClose={() => {
                                setShowConfirmation(false);
                                setManuallyClosedDrawer(true);
                            }}
                            onInfoClick={() => setShowInfo(true)}
                            onActionResult={onActionResult}
                            onCashierError={onCashierError}
                            handleSuccessContinue={handleSuccessContinue}
                            handleConfirmTransaction={handleConfirmTransaction}
                        />
                    </>
                )}
            </SheetWrapper>
        </MainAppLayout>
    );
}
