import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIdentity } from "@nfid/identitykit/react";
import { convertTokenAmountToNumber } from "@/utils";
import useTokenMetadata from "@/hooks/tokenUtilsHooks";
import { TokenUtilService } from "@/services/tokenUtils.service";
interface TestFormProps {
    onCancel?: () => void;
}
export function TransferTestForm(props: TestFormProps) {
    const [receiver, setReceiver] = React.useState("");
    const [tokenAddress, setTokenAddress] = React.useState("");
    const [status, setStatus] = React.useState("N/A");
    const [amount, setAmount] = React.useState(0);
    const identity = useIdentity();
    const { metadata } = useTokenMetadata(tokenAddress);

    const onReceiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReceiver(e.target.value);
    };
    const onTokenAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTokenAddress(e.target.value);
    };
    const onAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedAmount = parseInt(e.target.value.toString());
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            setAmount(0);
            return;
        }
        setAmount(parsedAmount);
    };
    const handleSubmitForm = async () => {
        try {
            if (metadata) {
                setStatus("Processing");
                const tokenUtils = new TokenUtilService(identity);
                await tokenUtils.transferTo(
                    receiver,
                    tokenAddress,
                    convertTokenAmountToNumber(amount, metadata.decimals),
                );
                setStatus("Success");
            } else {
                console.log("Can not get token metadata");
            }
        } catch (e) {
            console.log(e);
            setStatus("Failed");
        }
    };
    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Transfer</CardTitle>
                <CardDescription>Test transfer token to other wallet</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="receiver">Receiver</Label>
                            <Input
                                id="receiver"
                                placeholder="Receiver address"
                                value={receiver}
                                onChange={onReceiverChange}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="link">Token address</Label>
                            <Input
                                id="tokenAddress"
                                placeholder="Token address"
                                value={tokenAddress}
                                onChange={onTokenAddressChange}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                placeholder="Amount to transfer"
                                value={amount}
                                onChange={onAmountChange}
                            />
                        </div>
                    </div>
                </form>
                <div className="mt-3">Status: {status}</div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={props.onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmitForm}>Submit</Button>
            </CardFooter>
        </Card>
    );
}
