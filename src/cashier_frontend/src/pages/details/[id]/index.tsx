import * as React from "react";
import { cn } from "@/lib/utils";
import { StateBadge } from "@/components/link-item";
import { Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "@/components/ui/button";
import useToast from "@/hooks/useToast";
import { useParams, useNavigate } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import LinkService from "@/services/link.service";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import QRCode from "react-qr-code";
import { LinkModel } from "@/services/types/link.service.types";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { ACTION_TYPE } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import { TokenUtilService } from "@/services/tokenUtils.service";
import TransactionToast from "@/components/transaction/transaction-toast";
import { useSkeletonLoading } from "@/hooks/useSkeletonLoading";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/link-details/social-buttons";
import { useResponsive } from "@/hooks/responsive-hook";
import { EndLinkDrawer } from "@/components/link-details/end-link-drawer";
import { useCreateAction, useUpdateLink } from "@/hooks/linkHooks";
import { getLinkAssetAmounts, getLinkIsClaimed } from "@/utils/helpers/link";
import { LINK_STATE } from "@/services/types/enum";
import { customDriverStyles, initializeDriver } from "@/components/onboarding";
import { ConfirmationDrawer } from "@/components/confirmation-drawer/confirmation-drawer";
import { ActionModel } from "@/services/types/action.service.types";
import { useLinkActionStore } from "@/stores/linkActionStore";

export default function DetailPage() {
    const [linkData, setLinkData] = React.useState<LinkModel | undefined>();
    const { linkId } = useParams();
    const identity = useIdentity();
    const navigate = useNavigate();
    const { toastData, showToast, hideToast } = useToast();
    const { renderSkeleton } = useSkeletonLoading();
    const responsive = useResponsive();

    const { mutateAsync: createAction } = useCreateAction(ACTION_TYPE.WITHDRAW_LINK);

    const [showOverlay, setShowOverlay] = React.useState(true);
    const [driverObj, setDriverObj] = React.useState<Driver | undefined>(undefined);

    const [showEndLinkDrawer, setShowEndLinkDrawer] = React.useState(false);
    const [showConfirmationDrawer, setShowConfirmationDrawer] = React.useState(false);
    const { setLink, setAction } = useLinkActionStore();

    const {} = useLinkActionStore();

    // Add styles to document
    React.useEffect(() => {
        const driver = initializeDriver();
        setDriverObj(driver);

        const styleTag = document.createElement("style");
        styleTag.innerHTML = customDriverStyles;
        document.head.appendChild(styleTag);

        console.log("linkData", linkData);

        return () => {
            document.head.removeChild(styleTag);
        };
    }, []);

    const [assetAmounts, setAssetAmounts] = React.useState<
        {
            address: string;
            totalAmount: bigint;
            pendingAmount: bigint;
            claimsAmount: bigint | undefined;
            assetClaimed: boolean;
        }[]
    >([]);
    const [linkIsClaimed, setLinkIsClaimed] = React.useState<boolean>(false);

    React.useEffect(() => {
        const fetchAssetAmounts = async () => {
            if (linkData) {
                const assetAmounts = await getLinkAssetAmounts(linkData.link);
                setAssetAmounts(assetAmounts);
            }
        };
        const fetchLinkIsClaimed = async () => {
            if (linkData) {
                const linkIsClaimed = await getLinkIsClaimed(linkData.link);
                setLinkIsClaimed(linkIsClaimed);
            }
        };
        fetchAssetAmounts();
        fetchLinkIsClaimed();
    }, [linkData]);

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
    }, [showOverlay, driverObj, linkData]);

    //TODO: Update to apply asset_info as the list of assets
    const { metadata } = useTokenMetadata(linkData?.link.asset_info[0].address);
    const { t } = useTranslation();

    const { mutateAsync: updateLink } = useUpdateLink();

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

        // Check if this link has been viewed before
        const viewedLinks = JSON.parse(localStorage.getItem("viewedLinks") || "[]");
        const hasBeenViewed = viewedLinks.includes(linkId);

        // Only show overlay for links that haven't been viewed before
        setShowOverlay(!hasBeenViewed);

        // If this is a new link, add it to viewed links in localStorage
        if (!hasBeenViewed) {
            const updatedViewedLinks = [...viewedLinks, linkId];
            localStorage.setItem("viewedLinks", JSON.stringify(updatedViewedLinks));
        }

        const fetchData = async () => {
            const link = await new LinkService(identity).getLink(linkId, ACTION_TYPE.WITHDRAW_LINK);
            setLinkData(link);
        };
        fetchData();
    }, [linkId, identity]);

    const setInactiveLink = async () => {
        try {
            if (!linkData) throw new Error("Link data is not available");
            const inactiveLink = await updateLink({
                linkId: linkData.link.id,
                linkModel: linkData.link,
                isContinue: true,
            });
            console.log("🚀 ~ setInactiveLink ~ inactiveLink:", inactiveLink);
            const link = await new LinkService(identity).getLink(
                linkData!.link.id,
                ACTION_TYPE.WITHDRAW_LINK,
            );
            setLinkData(link);
            setShowEndLinkDrawer(false);
        } catch (error) {
            console.error("Error setting link inactive:", error);
        }
    };

    const setInactiveEndedLink = async () => {
        try {
            if (!linkData) throw new Error("Link data is not available");
            const inactiveLink = await updateLink({
                linkId: linkData.link.id,
                linkModel: linkData.link,
                isContinue: true,
            });
            console.log("🚀 ~ setInactiveLink ~ inactiveLink:", inactiveLink);
            const link = await new LinkService(identity).getLink(
                linkData!.link.id,
                ACTION_TYPE.WITHDRAW_LINK,
            );
            setLinkData(link);
            setShowConfirmationDrawer(false);
        } catch (error) {
            console.error("Error setting link inactive:", error);
        }
    };

    const handleWithdrawAssets = async () => {
        try {
            const actionResult = await createAction({ linkId: linkData!.link.id });
            console.log("🚀 ~ handleWithdrawAssets ~ actionResult:", actionResult);
            setLink(linkData?.link);
            setAction(actionResult);
        } catch (error) {
            console.error("Error creating withdraw action:", error);
        }
    };

    const handleCashierError = (error: Error) => {
        showToast("Error", error.message, "error");
        setShowConfirmationDrawer(false);
    };

    const handleActionResult = (actionResult: ActionModel) => {
        setAction(actionResult);
        setLinkData(linkData);
    };

    return (
        <div
            className={cn(
                "w-screen h-dvh max-h-dvh flex flex-col items-center py-3",
                "md:h-[90%] md:w-[40%] md:flex md:flex-col md:items-center md:py-5 md:bg-[white] md:rounded-md md:drop-shadow-md",
            )}
        >
            <div className="w-11/12 flex flex-col flex-grow sm:max-w-[400px] md:max-w-[100%]">
                <div className="w-full flex flex-grow flex-col">
                    {!linkData ? (
                        renderSkeleton()
                    ) : (
                        <>
                            <div id="heading-section" className="flex mb-5 items-center">
                                <div
                                    className="absolute left-5 cursor-pointer"
                                    onClick={() => {
                                        navigate("/");
                                    }}
                                >
                                    <ChevronLeftIcon width={26} height={26} />
                                </div>
                                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mx-auto flex-grow text-center">
                                    {linkData?.link?.title}
                                </h4>
                            </div>
                            <div
                                className={`flex ${responsive.isSmallDevice ? "flex-col gap-2" : "flex-row justify-start items-between gap-8 mb-4"}`}
                            >
                                <div
                                    className={`flex items-center justify-center ${responsive.isSmallDevice ? "" : "hidden"}`}
                                >
                                    <StateBadge state={linkData?.link?.state} />
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
                                        <StateBadge state={linkData?.link?.state} />
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
                                    <p className="text-sm text-primary/80">Tip Link</p>
                                </div>
                                <div className="flex flex-row items-center justify-between border-lightgreen border-b px-5 py-2.5">
                                    <p className="font-medium text-sm">Chain</p>
                                    <p className="text-sm text-primary/80">ICP</p>
                                </div>
                                <div className="flex flex-row items-center justify-between border-lightgreen border-b px-5 py-2.5">
                                    <p className="font-medium text-sm">Token</p>
                                    <p className="text-sm text-primary/80">
                                        {metadata?.name === "CUTE" ? "tCHAT" : metadata?.name}
                                    </p>
                                </div>
                                <div className="flex flex-row items-center justify-between border-lightgreen px-5 py-2.5">
                                    <p className="font-medium text-sm">Asset left/added</p>
                                    <div className="flex items-center gap-1">
                                        <p className="text-sm text-primary/80">
                                            {assetAmounts && assetAmounts.length
                                                ? TokenUtilService.getHumanReadableAmountFromMetadata(
                                                      assetAmounts[0].pendingAmount,
                                                      metadata,
                                                  )
                                                : "-"}
                                            /
                                            {TokenUtilService.getHumanReadableAmountFromMetadata(
                                                linkData?.link?.asset_info[0].amount,
                                                metadata,
                                            )}
                                        </p>
                                        {metadata && metadata.icon && (
                                            <img
                                                src={metadata?.icon}
                                                alt="token-icon"
                                                className="w-4 h-4"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-4 mt-auto">
                                {linkData?.link?.state == LINK_STATE.ACTIVE && (
                                    <button
                                        onClick={() => {
                                            setShowEndLinkDrawer(true);
                                        }}
                                        className="text-[#D26060] text-[14px] font-semibold"
                                    >
                                        End Link
                                    </button>
                                )}
                                {linkData?.link?.state == LINK_STATE.ACTIVE && (
                                    <Button
                                        id="copy-link-button"
                                        onClick={handleCopyLink}
                                        size="lg"
                                        className="w-full"
                                    >
                                        {t("details.copyLink")}
                                    </Button>
                                )}{" "}
                                {linkData?.link?.state == LINK_STATE.INACTIVE && (
                                    <Button
                                        id="copy-link-button"
                                        disabled={linkIsClaimed}
                                        onClick={() => {
                                            handleWithdrawAssets();
                                            setShowConfirmationDrawer(true);
                                        }}
                                        size="lg"
                                        className="w-full disabled:bg-gray-300"
                                    >
                                        {t("details.withdrawAssets")}
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
            </div>

            <EndLinkDrawer
                open={showEndLinkDrawer}
                onClose={() => setShowEndLinkDrawer(false)}
                onDelete={() => {
                    setInactiveLink();
                }}
            />

            <ConfirmationDrawer
                open={showConfirmationDrawer}
                onClose={() => setShowConfirmationDrawer(false)}
                onInfoClick={() => {}}
                onActionResult={handleActionResult}
                onCashierError={handleCashierError}
                onSuccessContinue={async () => {
                    setInactiveEndedLink();
                }}
            />
        </div>
    );
}
