import React from "react";
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
    const handleCopyLink = () => {
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
            <Button onClick={handleCopyLink as any} className="my-3">
                Copy
            </Button>
            <Button onClick={handleSubmit as any} className="my-3" variant={"outline"}>
                End the Link
            </Button>
        </div>
    );
};
