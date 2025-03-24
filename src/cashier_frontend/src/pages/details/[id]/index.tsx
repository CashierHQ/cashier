import * as React from "react";
import { cn } from "@/lib/utils";
import { StateBadge } from "@/components/link-item";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { useIdentity } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import LinkService from "@/services/link.service";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import QRCode from "react-qr-code";
import { LinkModel } from "@/services/types/link.service.types";
import { Skeleton } from "@/components/ui/skeleton";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { ACTION_TYPE } from "@/services/types/enum";
import { useTranslation } from "react-i18next";
import { TokenUtilService } from "@/services/tokenUtils.service";

export default function DetailPage() {
    const [linkData, setLinkData] = React.useState<LinkModel | undefined>();
    const { linkId } = useParams();
    const identity = useIdentity();
    const { toast } = useToast();
    const navigate = useNavigate();
    //TODO: Update to apply asset_info as the list of assets
    const { metadata } = useTokenMetadata(linkData?.link.asset_info[0].address);
    const { t } = useTranslation();

    const handleCopyLink = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            copy(window.location.href.replace("details/", ""));
            toast({
                description: "Copied",
            });
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };

    const renderSkeletonLoading = () => {
        return Array.from({ length: 5 }).map((_, index) => (
            <div className="flex items-center space-x-4 my-3" key={index}>
                <Skeleton className="h-10 w-10 rounded-sm" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-[75vw] max-w-[320px]" />
                    <Skeleton className="h-3 w-[200px]" />
                </div>
            </div>
        ));
    };

    React.useEffect(() => {
        if (!linkId) return;
        if (!identity) return;
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
            <div className="w-11/12 flex flex-col flex-grow sm:max-w-[400px] md:max-w-[100%]">
                <div className="w-full flex flex-col">
                    {!linkData ? (
                        renderSkeletonLoading()
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
                            <div id="qr-code-section" className="flex flex-col my-2">
                                <div className="flex items-center justify-center grow">
                                    <StateBadge state={linkData?.link?.state} />
                                </div>
                                <div className="flex items-center justify-center grow mt-3">
                                    <QRCode
                                        size={100}
                                        value={window.location.href.replace("details/", "")}
                                    />
                                </div>
                            </div>

                            <h2 className="font-medium leading-6 text-gray-900 ml-2">
                                {t("details.linkInfo")}
                            </h2>
                            <div
                                id="link-detail-section"
                                className="flex flex-col my-3 border-[1px] rounded-xl border-lightgreen"
                            >
                                <Table className="text-base">
                                    <TableHeader></TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium px-5">
                                                Link Type
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right px-5 text-lightblack">
                                                Tip link
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium px-5">
                                                Chain
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right px-5 text-lightblack">
                                                ICP
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
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
                                onClick={handleCopyLink}
                                size="lg"
                                className="fixed text-[1rem] bottom-[30px] w-[90%] max-w-[350px] left-1/2 -translate-x-1/2"
                            >
                                {t("details.copyLink")}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
