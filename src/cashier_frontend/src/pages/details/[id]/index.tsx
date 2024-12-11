import * as React from "react";
import { StateBadge } from "@/components/link-item";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useParams, useNavigate } from "react-router-dom";
import { useIdentityKit } from "@nfid/identitykit/react";
import copy from "copy-to-clipboard";
import LinkService from "@/services/link.service";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import QRCode from "react-qr-code";
import { LinkModel } from "@/services/types/link.service.types";

export default function DetailPage() {
    const [linkData, setLinkData] = React.useState<LinkModel>({} as LinkModel);
    const { linkId } = useParams();
    const { identity } = useIdentityKit();
    const { toast } = useToast();
    const navigate = useNavigate();

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
    React.useEffect(() => {
        if (!linkId) return;
        if (!identity) return;
        const fetchData = async () => {
            const link = await new LinkService(identity).getLink(linkId);
            setLinkData(link);
        };
        fetchData();
    }, [linkId, identity]);

    return (
        <div className="w-screen flex flex-col items-center py-3">
            <div className="h-[80vh] w-11/12 max-w-[400px]">
                <div className="w-full flex flex-col">
                    <div id="heading-section" className="flex mb-5">
                        <div
                            className="cursor-pointer"
                            onClick={() => {
                                navigate("/");
                            }}
                        >
                            <ChevronLeftIcon width={25} height={25} />
                        </div>
                        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center mx-auto">
                            {linkData?.link?.title}
                        </h4>
                    </div>
                    <div id="qr-code-section" className="flex flex-col">
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
                    <div
                        id="link-detail-section"
                        className="flex flex-col my-5 border-2 rounded-xl"
                    >
                        <Table className="text-base">
                            <TableHeader></TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium px-5">Link Type</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right px-5">AirDrop</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium px-5">Chain</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right px-5">ICP</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium px-5">Token</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right px-5">
                                        Proof of attendance NFT
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium px-5">Amount</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right px-5">
                                        {linkData?.link?.amount}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div
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
                    </div>
                    <Button
                        onClick={handleCopyLink}
                        className="fixed text-[1rem] bottom-[30px] w-[80vw] max-w-[350px] rounded-full left-1/2 -translate-x-1/2 py-5"
                    >
                        Copy
                    </Button>
                </div>
            </div>
        </div>
    );
}
