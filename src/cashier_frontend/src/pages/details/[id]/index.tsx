import * as React from "react";
import { cn } from "@/lib/utils";
import { StateBadge } from "@/components/link-item";
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

export default function DetailPage() {
    const [linkData, setLinkData] = React.useState<LinkModel | undefined>();
    const { linkId } = useParams();
    const identity = useIdentity();
    const navigate = useNavigate();
    const { toastData, showToast, hideToast } = useToast();
    const { renderSkeleton } = useSkeletonLoading();
    const responsive = useResponsive();

    const [showOverlay, setShowOverlay] = React.useState(false);

    //TODO: Update to apply asset_info as the list of assets
    const { metadata } = useTokenMetadata(linkData?.link.asset_info[0].address);
    const { t } = useTranslation();

    const handleCopyLink = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
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

            {showOverlay && (
                <CopyLinkOverlay
                    showOverlay={showOverlay}
                    setShowOverlay={setShowOverlay}
                    handleCopyLink={handleCopyLink}
                />
            )}
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
                            <Button
                                id="copy-link-button"
                                onClick={handleCopyLink}
                                size="lg"
                                className="fixed text-[1rem] bottom-[30px] w-[90%] max-w-[350px] left-1/2 -translate-x-1/2"
                            >
                                {t("details.copyLink")}
                            </Button>

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
        </div>
    );
}

function CopyLinkOverlay({
    showOverlay,
    setShowOverlay,
    handleCopyLink,
}: {
    showOverlay: boolean;
    setShowOverlay: (showOverlay: boolean) => void;
    handleCopyLink: (e: React.SyntheticEvent) => void;
}) {
    function handleCopyAndCloseOverlay(e: React.SyntheticEvent) {
        handleCopyLink(e);
        setShowOverlay(false);
    }

    function handleCloseOverlay() {
        setShowOverlay(false);
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={handleCloseOverlay}>
            <div className="absolute bottom-0 left-0 right-0 flex justify-center sm:items-center sm:bottom-auto sm:inset-24">
                <div
                    className="bg-white p-5 rounded-t-3xl rounded-b-none w-full sm:rounded-3xl sm:w-auto sm:max-w-sm shadow-lg text-center relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-center items-center mb-2">
                        <div className="bg-teal-50 rounded-full flex items-center justify-center p-3">
                            <PartyPopper className="h-7 w-7 text-teal-500" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Congratulations!</h3>
                    <p className="text-gray-700 font-light text-sm">
                        You've created a link. Copy the link address, and share it with others.
                    </p>

                    <Button
                        id="copy-link-button"
                        onClick={handleCopyAndCloseOverlay}
                        size="lg"
                        className="w-full mt-8"
                    >
                        Copy Link
                    </Button>

                    <button
                        onClick={handleCloseOverlay}
                        className="w-full mt-4 text-sm text-gray-500"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
