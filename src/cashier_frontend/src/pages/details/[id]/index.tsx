// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import * as React from "react";
import { Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import { LinkDetail } from "@/components/detail-page/link-detail";
import { useParams, useNavigate } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { ACTION_TYPE, ACTION_STATE, LINK_TYPE } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { EndLinkDrawer } from "@/components/link-details/end-link-drawer";
import { ShareLinkDrawer } from "@/components/link-details/share-link-drawer";
import { LINK_STATE } from "@/services/types/enum";
import { customDriverStyles, initializeDriver } from "@/components/onboarding";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { ActionModel } from "@/services/types/action.service.types";
import { useLinkAction } from "@/hooks/useLinkAction";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { useProcessAction, useUpdateAction } from "@/hooks/action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";
import { toast } from "sonner";

export default function DetailPage() {
    const { linkId } = useParams();
    const identity = useIdentity();
    const navigate = useNavigate();
    const { renderSkeleton } = useSkeletonLoading();

    const {
        link,
        isLoading,
        setAction,
        createAction,
        callLinkStateMachine,
        isUpdating,
        isProcessingAction,
        refetchLinkDetail,
        refetchAction,
        action,
    } = useLinkAction(linkId, ACTION_TYPE.WITHDRAW_LINK);

    const [showOverlay, setShowOverlay] = React.useState(true);
    const [driverObj, setDriverObj] = React.useState<Driver | undefined>(undefined);

    const [showShareLinkDrawer, setShowShareLinkDrawer] = React.useState(false);
    const [showEndLinkDrawer, setShowEndLinkDrawer] = React.useState(false);
    const [showConfirmationDrawer, setShowConfirmationDrawer] = React.useState(false);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [isCallStateMachine, setIsCallStateMachine] = React.useState(false);

    const { t } = useTranslation();

    // Button state for confirmation drawer
    const [drawerConfirmButton, setDrawerConfirmButton] = React.useState<{
        text: string;
        disabled: boolean;
    }>({
        text: t("confirmation_drawer.confirm_button"),
        disabled: false,
    });

    const { mutateAsync: processAction } = useProcessAction();
    const { mutateAsync: updateAction } = useUpdateAction();
    const { mutateAsync: icrc112Execute } = useIcrc112Execute();

    React.useEffect(() => {
        const driver = initializeDriver();
        setDriverObj(driver);

        const styleTag = document.createElement("style");
        styleTag.innerHTML = customDriverStyles;
        document.head.appendChild(styleTag);

        return () => {
            document.head.removeChild(styleTag);
        };
    }, []);

    // Check if link has assets that can be withdrawn
    const hasWithdrawableAssets = React.useMemo(() => {
        if (!link) return false;

        // based on the link type, check if it has assets
        if (
            link.linkType === LINK_TYPE.SEND_AIRDROP ||
            link.linkType === LINK_TYPE.SEND_TIP ||
            link.linkType === LINK_TYPE.SEND_TOKEN_BASKET
        ) {
            return link.useActionCounter < link.maxActionNumber;
        } else if (link.linkType === LINK_TYPE.RECEIVE_PAYMENT) {
            return link.useActionCounter > 0;
        }
    }, [link]);

    React.useEffect(() => {
        if (showOverlay && driverObj && document.getElementById("copy-link-button")) {
            driverObj.highlight({
                element: "#copy-link-button",
                popover: {
                    title: "Congratulations!",
                    description:
                        "You've created a link. Copy the link address, and share it with others.",
                },
            });
        }
    }, [showOverlay, driverObj, link]);

    // Update button text based on action state and processing state
    React.useEffect(() => {
        // If we're actively processing, show "Processing..." regardless of action state
        if (isProcessing || isCallStateMachine) {
            setDrawerConfirmButton({
                text: t("confirmation_drawer.inprogress_button"),
                disabled: true,
            });
            return;
        }

        if (!action) {
            setDrawerConfirmButton({
                text: t("confirmation_drawer.confirm_button"),
                disabled: false,
            });
            return;
        }

        const actionState = action.state;
        if (actionState === ACTION_STATE.SUCCESS) {
            setDrawerConfirmButton({
                text: t("continue"),
                disabled: false,
            });
        } else if (actionState === ACTION_STATE.PROCESSING) {
            setDrawerConfirmButton({
                text: t("confirmation_drawer.inprogress_button"),
                disabled: true,
            });
        } else if (actionState === ACTION_STATE.FAIL) {
            setDrawerConfirmButton({
                text: t("retry"),
                disabled: false,
            });
        } else {
            setDrawerConfirmButton({
                text: t("confirmation_drawer.confirm_button"),
                disabled: false,
            });
        }
    }, [action, isProcessing, t]);

    // Polling effect to update action state during processing
    React.useEffect(() => {
        let intervalId: number | null = null;

        if (isProcessing) {
            intervalId = setInterval(async () => {
                try {
                    // Refresh action data
                    await refetchAction(linkId!, ACTION_TYPE.WITHDRAW_LINK);

                    // If action is completed, stop polling
                    if (
                        action &&
                        (action.state === ACTION_STATE.SUCCESS ||
                            action.state === ACTION_STATE.FAIL)
                    ) {
                        setIsProcessing(false);
                    }
                } catch (error) {
                    console.error("Error in polling interval:", error);
                }
            }, 1500); // Poll every 2 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isProcessing, refetchLinkDetail, action]);

    const handleCopyLink = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            setShowOverlay(false);
            driverObj?.destroy();
            copy(window.location.href.replace("details/", ""));
            toast.success(t("common.copied"));
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };

    React.useEffect(() => {
        if (!linkId) return;
        if (!identity) return;

        const viewedLinks = JSON.parse(localStorage.getItem("viewedLinks") || "[]");
        const hasBeenViewed = viewedLinks.includes(linkId);

        setShowOverlay(!hasBeenViewed);

        if (!hasBeenViewed) {
            const updatedViewedLinks = [...viewedLinks, linkId];
            localStorage.setItem("viewedLinks", JSON.stringify(updatedViewedLinks));
        }
    }, [linkId, identity]);

    const setInactiveLink = async () => {
        try {
            if (!link) throw new Error("Link data is not available");
            await callLinkStateMachine({
                linkId: link.id,
                linkModel: {},
                isContinue: true,
            });
            await refetchLinkDetail();
            setShowEndLinkDrawer(false);
        } catch (error) {
            console.error("Error setting link inactive:", error);
        }
    };

    const setInactiveEndedLink = async () => {
        try {
            if (!link) throw new Error("Link data is not available");

            setDrawerConfirmButton({
                text: t("processing"),
                disabled: true,
            });
            setIsCallStateMachine(true);

            await callLinkStateMachine({
                linkId: link.id,
                linkModel: {},
                isContinue: true,
            });

            await refetchLinkDetail();

            setShowConfirmationDrawer(false);
        } catch (error) {
            console.error("Error setting link inactive:", error);
        } finally {
            setIsCallStateMachine(false);
        }
    };

    const handleWithdrawAssets = async () => {
        try {
            if (!link) throw new Error("Link data is not available");
            if (action) {
                setAction(action);
            } else {
                const actionResult = await createAction(link.id, ACTION_TYPE.WITHDRAW_LINK);
                setAction(actionResult);
            }

            setShowConfirmationDrawer(true);
        } catch (error) {
            console.error("Error creating withdraw action:", error);
        }
    };

    const handleWithdrawProcess = async () => {
        try {
            if (!link) throw new Error("Link is not defined");
            if (!action) throw new Error("Action is not defined");

            // Set processing state to true to activate polling
            setIsProcessing(true);

            const firstUpdatedAction = await processAction({
                linkId: link.id,
                actionType: ACTION_TYPE.WITHDRAW_LINK,
                actionId: action.id,
            });

            setAction(firstUpdatedAction);

            if (firstUpdatedAction) {
                const response = await icrc112Execute({
                    transactions: firstUpdatedAction.icrc112Requests,
                });

                if (response) {
                    const secondUpdatedAction = await updateAction({
                        actionId: action.id,
                        linkId: link.id,
                        external: true,
                    });

                    if (secondUpdatedAction) {
                        setAction(secondUpdatedAction);
                        handleActionResult(secondUpdatedAction);

                        // If action completed successfully, stop polling
                        if (
                            secondUpdatedAction.state === ACTION_STATE.SUCCESS ||
                            secondUpdatedAction.state === ACTION_STATE.FAIL
                        ) {
                            setIsProcessing(false);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error in withdrawal process:", error);
            // Make sure to stop polling if there's an error
            setIsProcessing(false);
            throw error;
        }
    };

    const handleCashierError = (error: Error) => {
        toast.error(t("common.error"), {
            description: error.message,
        });
        console.error("Cashier error:", error);
        setShowConfirmationDrawer(false);
    };

    const handleActionResult = (actionResult: ActionModel) => {
        setAction(actionResult);
    };

    return (
        <MainAppLayout>
            <div className="w-full flex flex-col h-full relative pb-24">
                {isLoading && !link ? (
                    renderSkeleton()
                ) : (
                    <>
                        {/* Fixed Header */}
                        <div
                            id="heading-section"
                            className="flex items-center sticky top-0 bg-white z-10 py-3"
                        >
                            <div
                                className="absolute left-0 cursor-pointer"
                                onClick={() => {
                                    navigate("/");
                                }}
                            >
                                <ChevronLeftIcon width={26} height={26} />
                            </div>
                            <h4 className="scroll-m-20 text-lg font-semibold tracking-tight mx-auto flex-grow text-center">
                                {link?.title}
                            </h4>
                        </div>

                        {/* Scrollable Content Area */}
                        {link && (
                            <div className="flex-grow overflow-y-auto pb-24 scrollbar-hide">
                                <LinkDetail
                                    link={link}
                                    onShareClick={() => setShowShareLinkDrawer(true)}
                                />
                            </div>
                        )}

                        {/* Fixed Footer */}
                        <div className="absolute bottom-0 left-0 right-0 pt-4 pb-[21px] w-full flex flex-col items-center gap-4">
                            {link?.state == LINK_STATE.ACTIVE && (
                                <button
                                    onClick={() => {
                                        setShowEndLinkDrawer(true);
                                    }}
                                    className="w-[95%] h-[44px] border bg-white border-[#D26060] mx-auto text-[#D26060] flex items-center justify-center rounded-full font-semibold text-[14px] hover:bg-[#D26060] hover:text-white transition-colors"
                                >
                                    End Link
                                </button>
                            )}
                            {link?.state == LINK_STATE.ACTIVE && (
                                <Button
                                    id="copy-link-button"
                                    onClick={handleCopyLink}
                                    className="w-[95%] h-[44px]"
                                >
                                    {t("details.copyLink")}
                                </Button>
                            )}{" "}
                            {link?.state == LINK_STATE.INACTIVE && (
                                <Button
                                    id="copy-link-button"
                                    disabled={isProcessingAction || !hasWithdrawableAssets}
                                    onClick={() => {
                                        handleWithdrawAssets();
                                    }}
                                    className="w-[95%] h-[44px] disabled:bg-gray-300"
                                >
                                    {hasWithdrawableAssets
                                        ? t("details.withdrawAssets")
                                        : "No Assets To Withdraw"}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </div>

            <EndLinkDrawer
                open={showEndLinkDrawer}
                onClose={() => setShowEndLinkDrawer(false)}
                onDelete={() => {
                    setInactiveLink();
                }}
                isEnding={isUpdating}
            />

            <ShareLinkDrawer
                open={showShareLinkDrawer}
                onClose={() => setShowShareLinkDrawer(false)}
                onCopyLink={handleCopyLink}
                linkUrl={window.location.href.replace("details/", "")}
            />

            <ConfirmationDrawerV2
                open={showConfirmationDrawer}
                action={action}
                onClose={() => setShowConfirmationDrawer(false)}
                onInfoClick={() => {}}
                onActionResult={handleActionResult}
                onCashierError={handleCashierError}
                onSuccessContinue={async () => {
                    await setInactiveEndedLink();
                }}
                startTransaction={async () => {
                    try {
                        await handleWithdrawProcess();
                    } catch (error) {
                        console.error("Transaction error:", error);
                        // Error is already handled in handleWithdrawProcess
                    } finally {
                        // Ensure we get latest data after transaction attempt
                        try {
                            await refetchLinkDetail();
                        } catch (refreshError) {
                            console.error("Error refreshing data after transaction:", refreshError);
                        }
                    }
                }}
                isButtonDisabled={drawerConfirmButton.disabled}
                setButtonDisabled={(disabled) =>
                    setDrawerConfirmButton((prev) => ({ ...prev, disabled }))
                }
                buttonText={drawerConfirmButton.text}
                setButtonText={(text) => setDrawerConfirmButton((prev) => ({ ...prev, text }))}
            />
        </MainAppLayout>
    );
}
