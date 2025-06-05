// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
        refetchLinkDetail,
        action,
    } = useLinkAction(linkId, ACTION_TYPE.WITHDRAW_LINK);

    const [showOverlay, setShowOverlay] = React.useState(true);
    const [driverObj, setDriverObj] = React.useState<Driver | undefined>(undefined);

    const [showShareLinkDrawer, setShowShareLinkDrawer] = React.useState(false);
    const [showEndLinkDrawer, setShowEndLinkDrawer] = React.useState(false);
    const [showConfirmationDrawer, setShowConfirmationDrawer] = React.useState(false);

    // Button state for confirmation drawer
    const [confirmButtonDisabled, setConfirmButtonDisabled] = React.useState(false);
    const [confirmButtonText, setConfirmButtonText] = React.useState("");

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

    React.useEffect(() => {
        console.log("link", link);
    }, [link]);

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

    const { t } = useTranslation();

    // Update button text based on action state
    React.useEffect(() => {
        if (!action) return;

        const actionState = action.state;
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
    }, [action, t]);

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
            await callLinkStateMachine({
                linkId: link.id,
                linkModel: {},
                isContinue: true,
            });
            await refetchLinkDetail();
            setShowConfirmationDrawer(false);
        } catch (error) {
            console.error("Error setting link inactive:", error);
        }
    };

    const handleWithdrawAssets = async () => {
        try {
            if (!link) throw new Error("Link data is not available");
            const actionResult = await createAction(link.id, ACTION_TYPE.WITHDRAW_LINK);
            setAction(actionResult);
        } catch (error) {
            console.error("Error creating withdraw action:", error);
        }
    };

    const handleWithdrawProcess = async () => {
        if (!link) throw new Error("Link is not defined");
        if (!action) throw new Error("Action is not defined");
        const start = Date.now();

        console.log("[handleWithdrawProcess] Starting processAction...");
        const processActionStartTime = Date.now();
        const firstUpdatedAction = await processAction({
            linkId: link.id,
            actionType: ACTION_TYPE.WITHDRAW_LINK,
            actionId: action.id,
        });
        const processActionEndTime = Date.now();
        const processActionDuration = (processActionEndTime - processActionStartTime) / 1000;
        console.log(
            `[handleWithdrawProcess] processAction completed in ${processActionDuration.toFixed(2)}s`,
        );

        setAction(firstUpdatedAction);

        if (firstUpdatedAction) {
            console.log("[handleWithdrawProcess] Starting icrc112Execute...");
            const icrc112StartTime = Date.now();
            const response = await icrc112Execute({
                transactions: firstUpdatedAction.icrc112Requests,
            });
            const icrc112EndTime = Date.now();
            const icrc112Duration = (icrc112EndTime - icrc112StartTime) / 1000;
            console.log(
                `[handleWithdrawProcess] icrc112Execute completed in ${icrc112Duration.toFixed(2)}s`,
            );

            if (response) {
                console.log("[handleWithdrawProcess] Starting updateAction...");
                const updateActionStartTime = Date.now();
                const secondUpdatedAction = await updateAction({
                    actionId: action.id,
                    linkId: link.id,
                    external: true,
                });
                const updateActionEndTime = Date.now();
                const updateActionDuration = (updateActionEndTime - updateActionStartTime) / 1000;
                console.log(
                    `[handleWithdrawProcess] updateAction completed in ${updateActionDuration.toFixed(2)}s`,
                );

                if (secondUpdatedAction) {
                    setAction(secondUpdatedAction);
                    handleActionResult(secondUpdatedAction);
                }
            }
        }

        const end = Date.now();
        const duration = end - start;
        const durationInSeconds = (duration / 1000).toFixed(2);
        console.log(
            "[handleWithdrawProcess] Total withdraw process completed in",
            `${durationInSeconds}s`,
        );
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
                {isLoading || !link ? (
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
                        <div className="flex-grow overflow-y-auto pb-24 scrollbar-hide">
                            <LinkDetail
                                link={link}
                                onShareClick={() => setShowShareLinkDrawer(true)}
                            />
                        </div>

                        {/* Fixed Footer */}
                        <div className="absolute bottom-0 left-0 right-0 pt-4 pb-6 px-5 flex flex-col items-center gap-4">
                            {link?.state == LINK_STATE.ACTIVE && (
                                <button
                                    onClick={() => {
                                        setShowEndLinkDrawer(true);
                                    }}
                                    className="w-full border bg-white border-[#D26060] mx-auto text-[#D26060] flex items-center justify-center rounded-full font-semibold text-[14px] h-[44px] hover:bg-[#D26060] hover:text-white transition-colors"
                                >
                                    End Link
                                </button>
                            )}
                            {link?.state == LINK_STATE.ACTIVE && (
                                <Button
                                    id="copy-link-button"
                                    onClick={handleCopyLink}
                                    className="w-full"
                                >
                                    {t("details.copyLink")}
                                </Button>
                            )}{" "}
                            {link?.state == LINK_STATE.INACTIVE && (
                                <Button
                                    id="copy-link-button"
                                    disabled={!hasWithdrawableAssets}
                                    onClick={() => {
                                        handleWithdrawAssets();
                                        setShowConfirmationDrawer(true);
                                    }}
                                    className="w-full disabled:bg-gray-300"
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
                    await handleWithdrawProcess();
                }}
                isButtonDisabled={confirmButtonDisabled}
                setButtonDisabled={setConfirmButtonDisabled}
                buttonText={confirmButtonText}
                setButtonText={setConfirmButtonText}
            />
        </MainAppLayout>
    );
}
