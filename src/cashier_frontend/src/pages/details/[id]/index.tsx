import * as React from "react";
import { StateBadge } from "@/components/link-item";
import { Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import useToast from "@/hooks/useToast";
import { useParams, useNavigate } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import QRCode from "react-qr-code";
import { ACTION_TYPE, ACTION_STATE, getLinkTypeString } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import TransactionToast from "@/components/transaction/transaction-toast";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/link-details/social-buttons";
import { useResponsive } from "@/hooks/responsive-hook";
import { EndLinkDrawer } from "@/components/link-details/end-link-drawer";
import { LINK_STATE } from "@/services/types/enum";
import { customDriverStyles, initializeDriver } from "@/components/onboarding";
import { ConfirmationDrawerV2 } from "@/components/confirmation-drawer/confirmation-drawer-v2";
import { ActionModel } from "@/services/types/action.service.types";
import { useLinkAction } from "@/hooks/link-action-hooks";
import { useTokens } from "@/hooks/useTokens";
import { MainAppLayout } from "@/components/ui/main-app-layout";
import { AssetAvatarV2 } from "@/components/ui/asset-avatar";
import { useProcessAction, useUpdateAction } from "@/hooks/action-hooks";
import { useIcrc112Execute } from "@/hooks/use-icrc-112-execute";

export default function DetailPage() {
    const { linkId } = useParams();
    const identity = useIdentity();
    const navigate = useNavigate();
    const { toastData, showToast, hideToast } = useToast();
    const { renderSkeleton } = useSkeletonLoading();
    const responsive = useResponsive();

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
        // If useActionCounter is less than maxActionNumber, there are still actions/assets available
        return link.useActionCounter < link.maxActionNumber;
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
    const { getToken } = useTokens();

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
            showToast("Copied successfully", "", "default", undefined, false);
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
        showToast("Error", error.message, "error");
        setShowConfirmationDrawer(false);
    };

    const handleActionResult = (actionResult: ActionModel) => {
        setAction(actionResult);
    };

    // Calculate remaining actions and assets
    const calculateRemainingInfo = (maxActions: bigint, usedActions: bigint) => {
        if (maxActions <= BigInt(0)) return { remainingActions: BigInt(0), hasAssetsLeft: false };

        const remaining = maxActions > usedActions ? maxActions - usedActions : BigInt(0);
        return {
            remainingActions: remaining,
            hasAssetsLeft: remaining > BigInt(0),
        };
    };

    return (
        <MainAppLayout>
            <div className="w-full flex flex-grow flex-col">
                {isLoading || !link ? (
                    renderSkeleton()
                ) : (
                    <>
                        <div id="heading-section" className="flex mb-5 items-center relative">
                            <div
                                className="absolute left-0 cursor-pointer"
                                onClick={() => {
                                    navigate("/");
                                }}
                            >
                                <ChevronLeftIcon width={26} height={26} />
                            </div>
                            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mx-auto flex-grow text-center">
                                {link?.title}
                            </h4>
                        </div>
                        <div
                            className={`flex ${responsive.isSmallDevice ? "flex-col gap-2" : "flex-row justify-start items-between gap-8 mb-4"}`}
                        >
                            <div
                                className={`flex items-center justify-center ${responsive.isSmallDevice ? "" : "hidden"}`}
                            >
                                <StateBadge state={link?.state} />
                            </div>
                            <div
                                className={`flex items-center justify-center ${responsive.isSmallDevice ? " my-3" : "order-1"}`}
                            >
                                <QRCode
                                    size={responsive.isSmallDevice ? 100 : 130}
                                    value={window.location.href.replace("details/", "")}
                                />
                            </div>

                            <div
                                className={`${responsive.isSmallDevice ? "" : "order-2 flex flex-col items-start justify-between w-full"}`}
                            >
                                <div className={`${responsive.isSmallDevice ? "hidden" : ""}`}>
                                    <StateBadge state={link?.state} />
                                </div>
                                <SocialButtons handleCopyLink={handleCopyLink} />
                            </div>
                        </div>

                        <div className="flex gap-2 items-center mb-2">
                            <Label>{t("details.linkInfo")}</Label>
                        </div>
                        <div
                            id="link-detail-section"
                            className="flex flex-col border-[1px] rounded-xl border-lightgreen"
                        >
                            <div className="flex flex-row items-center justify-between border-lightgreen border-b px-5 py-2.5">
                                <p className="font-medium text-sm">Link Type</p>
                                <p className="text-sm text-primary/80">
                                    {getLinkTypeString(link.linkType!)}
                                </p>
                            </div>
                            <div className="flex flex-row items-center justify-between border-lightgreen border-b px-5 py-2.5">
                                <p className="font-medium text-sm">Chain</p>
                                <p className="text-sm text-primary/80">ICP</p>
                            </div>

                            {link.asset_info.length > 0 &&
                                link.asset_info.map((asset) => {
                                    const token = getToken(asset.address);
                                    if (!token) return null;

                                    const { remainingActions } = calculateRemainingInfo(
                                        link.maxActionNumber,
                                        link.useActionCounter,
                                    );

                                    // Calculate remaining asset amount using amountPerUse
                                    const remainingAmount = remainingActions * asset.amountPerUse;

                                    // Calculate total asset amount allocated to this link
                                    const totalAmount = link.maxActionNumber * asset.amountPerUse;

                                    return (
                                        <div
                                            key={asset.address}
                                            className="flex flex-row items-center justify-between border-lightgreen px-5 py-2.5"
                                        >
                                            <p className="font-medium text-sm">Asset left/added</p>
                                            <div className="flex items-center gap-1">
                                                <p className="text-sm text-primary/80">
                                                    {Number(remainingAmount) /
                                                        Math.pow(10, token.decimals)}
                                                    /
                                                    {Number(totalAmount) /
                                                        Math.pow(10, token.decimals)}
                                                </p>
                                                <p className="text-sm text-primary/80">
                                                    {token.symbol}
                                                </p>
                                                <AssetAvatarV2 token={token} className="w-4 h-4" />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="flex flex-col items-center gap-4 mb-2 mt-auto">
                            {link?.state == LINK_STATE.ACTIVE && (
                                <button
                                    onClick={() => {
                                        setShowEndLinkDrawer(true);
                                    }}
                                    className="text-[#D26060] text-[14px] font-semibold"
                                >
                                    End Link
                                </button>
                            )}
                            {link?.state == LINK_STATE.ACTIVE && (
                                <Button
                                    id="copy-link-button"
                                    onClick={handleCopyLink}
                                    className="w-full mb-2"
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

                        <TransactionToast
                            open={toastData?.open ?? false}
                            onOpenChange={hideToast}
                            title={toastData?.title ?? ""}
                            description={toastData?.description ?? ""}
                            variant={toastData?.variant ?? "default"}
                        />
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
