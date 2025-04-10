import * as React from "react";
import { cn } from "@/lib/utils";
import { StateBadge } from "@/components/link-item";
import { Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
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
import { PartyPopper } from "lucide-react";
import { Label } from "@/components/ui/label";
import SocialButtons from "@/components/link-details/social-buttons";
import { useResponsive } from "@/hooks/responsive-hook";
import { Helmet } from "react-helmet-async";
import { isLinkFullyClaimed } from "@/utils/helpers/link";
import { EndLinkDrawer } from "@/components/link-details/end-link-drawer";

// Add custom CSS for driver.js popover styling
const customDriverStyles = `
.custom-driver-popover-class {
    border-radius: 16px !important;
    box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.1) !important;
    background-color: white !important;
    padding: 20px !important;
    text-align: center !important;
    max-width: 320px !important;
}

.custom-driver-popover-class .driver-popover-title {
    font-size: 18px !important;
    font-weight: 600 !important;
    margin-bottom: 8px !important;
}

.custom-driver-popover-class .driver-popover-description {
    font-size: 14px !important;
    color: #6b7280 !important;
    font-weight: 300 !important;
}

.custom-driver-popover-class .driver-popover-arrow {
    border-color: white transparent transparent transparent !important;
}

.custom-driver-popover-class .icon-container {
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
}

.custom-driver-popover-class .icon-wrapper {
    background-color: #e6f7f5;
    border-radius: 50%;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}
`;

export default function DetailPage() {
    const [linkData, setLinkData] = React.useState<LinkModel | undefined>();
    const { linkId } = useParams();
    const identity = useIdentity();
    const navigate = useNavigate();
    const { toastData, showToast, hideToast } = useToast();
    const { renderSkeleton } = useSkeletonLoading();
    const responsive = useResponsive();

    const [showOverlay, setShowOverlay] = React.useState(true);
    const [driverObj, setDriverObj] = React.useState<Driver | undefined>(undefined);

    const [showEndLinkDrawer, setShowEndLinkDrawer] = React.useState(false);

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

    const initializeDriver = () => {
        const driverObj = driver({
            popoverClass: "custom-driver-popover-class",
            animate: false,
            allowClose: true,
            onPopoverRender: (popover) => {
                // Add party popper icon to the popover
                const iconContainer = document.createElement("div");
                iconContainer.className = "icon-container";

                const iconWrapper = document.createElement("div");
                iconWrapper.className = "icon-wrapper";

                const svgIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svgIcon.setAttribute("width", "28");
                svgIcon.setAttribute("height", "28");
                svgIcon.setAttribute("viewBox", "0 0 24 24");
                svgIcon.setAttribute("fill", "none");
                svgIcon.setAttribute("stroke", "#14b8a6");
                svgIcon.setAttribute("stroke-width", "2");
                svgIcon.setAttribute("stroke-linecap", "round");
                svgIcon.setAttribute("stroke-linejoin", "round");

                const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path1.setAttribute("d", "M5.8 11.3 2 22l10.7-3.79");
                svgIcon.appendChild(path1);

                const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path2.setAttribute("d", "M4 3h.01");
                svgIcon.appendChild(path2);

                const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path3.setAttribute("d", "M22 8h.01");
                svgIcon.appendChild(path3);

                const path4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path4.setAttribute("d", "M15 2h.01");
                svgIcon.appendChild(path4);

                const path5 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path5.setAttribute("d", "M22 20h.01");
                svgIcon.appendChild(path5);

                const path6 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path6.setAttribute(
                    "d",
                    "m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10",
                );
                svgIcon.appendChild(path6);

                const path7 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path7.setAttribute(
                    "d",
                    "m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17",
                );
                svgIcon.appendChild(path7);

                const path8 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path8.setAttribute(
                    "d",
                    "m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7",
                );
                svgIcon.appendChild(path8);

                const path9 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path9.setAttribute(
                    "d",
                    "M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z",
                );
                svgIcon.appendChild(path9);

                iconWrapper.appendChild(svgIcon);
                iconContainer.appendChild(iconWrapper);

                // Insert the icon at the beginning of the popover
                popover.wrapper.insertBefore(iconContainer, popover.wrapper.firstChild);

                // Position the popover above the button
                setTimeout(() => {
                    const button = document.getElementById("copy-link-button");
                    if (button) {
                        const buttonRect = button.getBoundingClientRect();
                        const popoverRect = popover.wrapper.getBoundingClientRect();

                        popover.wrapper.style.left = `${buttonRect.left + buttonRect.width / 2 - popoverRect.width / 2}px`;
                        popover.wrapper.style.top = `${buttonRect.top - popoverRect.height - 20}px`;
                    }
                }, 0);
            },
        });

        return driverObj;
    };

    //TODO: Update to apply asset_info as the list of assets
    const { metadata } = useTokenMetadata(linkData?.link.asset_info[0].address);
    const { t } = useTranslation();

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

    const shareUrl = window.location.href.replace("details/", "");
    const tokenName = metadata?.name === "CUTE" ? "tCHAT" : metadata?.name;
    const tokenAmount = linkData?.link?.asset_info[0].amount
        ? TokenUtilService.getHumanReadableAmountFromMetadata(
              linkData?.link?.asset_info[0].amount,
              metadata,
          )
        : "";
    const pageTitle = linkData?.link?.title || "Cashier Link";
    const pageDescription = `Claim ${tokenAmount} ${tokenName} tokens via this Cashier link!`;

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

    return (
        <div
            className={cn(
                "w-screen h-dvh max-h-dvh flex flex-col items-center py-3",
                "md:h-[90%] md:w-[40%] md:flex md:flex-col md:items-center md:py-5 md:bg-[white] md:rounded-md md:drop-shadow-md",
            )}
        >
            <Helmet>
                {/* Primary Meta Tags */}
                <title>{pageTitle}</title>
                <meta name="title" content={pageTitle} />
                <meta name="description" content={pageDescription} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={shareUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={shareUrl} />
                <meta property="twitter:title" content={pageTitle} />
                <meta property="twitter:description" content={pageDescription} />
            </Helmet>

            {/* {showOverlay && (
                <CopyLinkOverlay
                    showOverlay={showOverlay}
                    setShowOverlay={setShowOverlay}
                    handleCopyLink={handleCopyLink}
                />
            )} */}
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
                                <Table className="text-base">
                                    <TableHeader></TableHeader>
                                    <TableBody>
                                        <TableRow className="border-b border-lightgreen">
                                            <TableCell className="font-medium px-5">
                                                Link Type
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right px-5 text-lightblack">
                                                Tip link
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="border-b border-lightgreen">
                                            <TableCell className="font-medium px-5">
                                                Chain
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right px-5 text-lightblack">
                                                ICP
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="border-b border-lightgreen">
                                            <TableCell className="font-medium px-5">
                                                Token
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right px-5 text-lightblack">
                                                {metadata?.name === "CUTE"
                                                    ? "tCHAT"
                                                    : metadata?.name}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium px-5">
                                                Amount
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right px-5 text-lightblack">
                                                {TokenUtilService.getHumanReadableAmountFromMetadata(
                                                    linkData?.link?.asset_info[0].amount,
                                                    metadata,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Temporarily comment for grant application */}
                            {/* <div
                        id="additional-info-section"
                        className="flex flex-col my-5 border-2 rounded-xl"
                    >
                        <Table className="text-base">
                            <TableHeader></TableHeader>
                            <TableBody className="flex flex-col">
                                <TableRow className="flex justify-around">
                                    <TableCell>
                                        <div className="flex">
                                            <img
                                                src="/trophyIcon.png"
                                                alt="trophy-icon"
                                                className="mr-2"
                                            />{" "}
                                            <span>23</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex">
                                            <img
                                                src="/mouseClickIcon.png"
                                                alt="mouseClickIcon"
                                                className="mr-2"
                                            />{" "}
                                            <span>40</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex">
                                            <img
                                                src="/eyeIcon.png"
                                                alt="eye-icon"
                                                className="mr-2"
                                            />{" "}
                                            <span>55</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                <TableRow className="flex justify-between">
                                    <TableCell className="font-medium px-5">
                                        Claims per day
                                    </TableCell>
                                    <TableCell className="text-right px-5">5</TableCell>
                                </TableRow>
                                <TableRow className="flex justify-between">
                                    <TableCell className="font-medium px-5">
                                        Days since last claim
                                    </TableCell>
                                    <TableCell className="text-right px-5">2</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div> */}
                            <div className="flex flex-col items-center gap-4 mt-auto">
                                <button
                                    onClick={() => {
                                        setShowEndLinkDrawer(true);
                                    }}
                                    className="text-[#D26060] text-[14px] font-semibold"
                                >
                                    End Link
                                </button>
                                <Button
                                    id="copy-link-button"
                                    onClick={handleCopyLink}
                                    size="lg"
                                    className="w-full"
                                >
                                    {t("details.copyLink")}
                                </Button>
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
                onDelete={() => {}}
            />
        </div>
    );
}
