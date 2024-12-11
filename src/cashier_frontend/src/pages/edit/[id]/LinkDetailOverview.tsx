import { ParitalFormProps } from "@/components/multi-step-form";
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

interface LinkDetailOverviewData {
    name: string;
    image: string;
    description: string;
    state: string;
    chain: string;
    amount: number;
}

export const LinkDetailOverview = ({
    defaultValues,
    handleSubmit,
}: ParitalFormProps<LinkDetailOverviewData>) => {
    const { toast } = useToast();
    const handleCopyLink = () => {
        toast({
            description: "Copied",
        });

        navigator.clipboard.writeText(window.location.href.replace("edit/", ""));
    };

    return (
        <div className="w-full flex flex-col">
            <div id="qr-code-section" className="flex flex-col">
                <div className="flex items-center justify-center grow">
                    <StateBadge state={defaultValues.state} />
                </div>
                <div className="flex items-center justify-center grow">
                    <img src="/qr.png" alt="qrcode" />
                </div>
            </div>
            <div id="link-detail-section" className="flex flex-col my-5 border-2 rounded-xl">
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
                            <TableCell className="text-right px-5">{defaultValues.chain}</TableCell>
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
                                {defaultValues.amount}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
            <div id="additional-info-section" className="flex flex-col my-5 border-2 rounded-xl">
                <Table className="text-base">
                    <TableHeader></TableHeader>
                    <TableBody className="flex flex-col">
                        <TableRow className="flex justify-around">
                            <TableCell>
                                <div className="flex">
                                    <img src="/trophyIcon.png" alt="trophy-icon" className="mr-2" />{" "}
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
                                    <img src="/eyeIcon.png" alt="eye-icon" className="mr-2" />{" "}
                                    <span>55</span>
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow className="flex justify-between">
                            <TableCell className="font-medium px-5">Claims per day</TableCell>
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
            <Button onClick={handleSubmit as any} className="my-3" variant={"outline"}>
                End the Link
            </Button>
        </div>
    );
};
