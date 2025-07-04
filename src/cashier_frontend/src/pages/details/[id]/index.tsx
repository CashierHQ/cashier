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
import { ACTION_TYPE, LINK_TYPE } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { EndLinkDrawer } from "@/components/link-details/end-link-drawer";
import { ShareLinkDrawer } from "@/components/link-details/share-link-drawer";
import { LINK_STATE } from "@/services/types/enum";
import { customDriverStyles, initializeDriver } from "@/components/onboarding";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { ActionModel } from "@/services/types/action.service.types";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { toast } from "sonner";
import { useLinkDetailQuery } from "@/hooks/link-hooks";
import { useLinkMutations } from "@/hooks/useLinkMutations";
import { useWithdrawConfirmation } from "@/hooks/tx-cart/useWithdrawConfirmation";

export default function DetailPage() {
    const { linkId } = useParams();
    const identity = useIdentity();
    const navigate = useNavigate();
    const { renderSkeleton } = useSkeletonLoading();

    const linkDetailQuery = useLinkDetailQuery(linkId, ACTION_TYPE.WITHDRAW_LINK);
    const { callLinkStateMachine, isUpdating, createAction, isCreatingAction } = useLinkMutations();

    const link = linkDetailQuery.data?.link;
    const isLoading = linkDetailQuery.isLoading;
    const queryAction = linkDetailQuery.data?.action;

    // Local state for enriched action
    const [currentAction, setCurrentAction] = React.useState<ActionModel | undefined>(undefined);

    const [showOverlay, setShowOverlay] = React.useState(true);
    const [driverObj, setDriverObj] = React.useState<Driver | undefined>(undefined);

    const [showShareLinkDrawer, setShowShareLinkDrawer] = React.useState(false);
    const [showEndLinkDrawer, setShowEndLinkDrawer] = React.useState(false);
    const [showConfirmationDrawer, setShowConfirmationDrawer] = React.useState(false);

    const { t } = useTranslation();

    // Refetch function for the hook
    const refetchLinkDetail = async () => {
        await linkDetailQuery.refetch();
    };

    // Use withdrawal confirmation hook
    const { handleSuccessContinue, handleConfirmTransaction, onActionResult, onCashierError } =
        useWithdrawConfirmation({
            linkId: linkId ?? "",
            link: link!,
            currentAction,
            setCurrentAction,
            identity,
            refetchLinkDetail,
            setShowConfirmationDrawer,
        });

    // Update local action state when query action changes
    React.useEffect(() => {
        if (queryAction) {
            setCurrentAction(queryAction);
        }
    }, [queryAction]);

    React.useEffect(() => {
        linkDetailQuery.refetch();
    }, []);

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

    const initiateWithdrawAction = async () => {
        try {
            if (!link) throw new Error("Link data is not available");
            if (currentAction) {
                // Action already exists, use it
                setShowConfirmationDrawer(true);
            } else {
                // Create new action
                const actionResult = await createAction({
                    linkId: link.id,
                    actionType: ACTION_TYPE.WITHDRAW_LINK,
                });
                if (actionResult) {
                    setCurrentAction(actionResult);
                }
                setShowConfirmationDrawer(true);
            }
        } catch (error) {
            console.error("Error creating withdraw action:", error);
        }
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
                                    disabled={isCreatingAction || !hasWithdrawableAssets}
                                    onClick={() => {
                                        initiateWithdrawAction();
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
                link={link!}
                action={currentAction}
                onClose={() => setShowConfirmationDrawer(false)}
                onInfoClick={() => {}}
                onActionResult={onActionResult}
                onCashierError={onCashierError}
                handleSuccessContinue={handleSuccessContinue}
                handleConfirmTransaction={handleConfirmTransaction}
            />
        </MainAppLayout>
    );
}
