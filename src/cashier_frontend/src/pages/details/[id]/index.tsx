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
import LinkService from "@/services/link.service";

export default function DetailPage() {
    const [linkData, setLinkData] = React.useState<any>({});
    const { linkId } = useParams();
    const { identity } = useIdentityKit();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleCopyLink = () => {
        toast({
            description: "Copied",
        });

        navigator.clipboard.writeText(window.location.href.replace("details/", ""));
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
        <div className="w-screen flex flex-col items-center py-5">
            <div className="w-11/12 max-w-[400px]">
                <div className="w-full flex flex-col">
                    <div id="heading-section" className="flex my-5">
                        <div
                            className="cursor-pointer"
                            onClick={() => {
                                navigate("/");
                            }}
                        >
                            ←
                        </div>
                        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight self-center mx-auto">
                            {linkData?.title}
                        </h4>
                    </div>
                    <div id="qr-code-section" className="flex flex-col">
                        <div className="flex items-center justify-center grow">
                            <StateBadge state={linkData?.state} />
                        </div>
                        <div className="flex items-center justify-center grow">
                            <img src="/qr.png" alt="qrcode" />
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
                                    <TableCell className="text-right px-5">
                                        {linkData?.chain}
                                    </TableCell>
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
                                        {linkData?.amount}
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
                    <Button onClick={handleCopyLink as any} className="my-3">
                        Copy
                    </Button>
                    <Button onClick={handleCopyLink as any} className="my-3" variant={"outline"}>
                        End the Link
                    </Button>
                </div>
            </div>
        </div>
    );
}
