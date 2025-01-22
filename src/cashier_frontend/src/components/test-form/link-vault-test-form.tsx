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
import CanisterUtilsService from "@/services/canisterUtils.service";
import { useIdentity } from "@nfid/identitykit/react";
import { TokenUtilService } from "@/services/tokenUtils.service";
interface TestFormProps {
    onCancel?: () => void;
}
export function LinkVaultTestForm(props: TestFormProps) {
    const [linkId, setLinkId] = React.useState("");
    const [tokenAddress, setTokenAddress] = React.useState("");
    const [balance, setBalance] = React.useState(0);
    const identity = useIdentity();
    const onLinkIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLinkId(e.target.value);
    };
    const onTokenAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTokenAddress(e.target.value);
    };
    const handleSubmitForm = async () => {
        try {
            const canisterUtils = new CanisterUtilsService(identity);
            const fetchedBalance = await canisterUtils.checkAccountBalanceWithSubAccount(
                linkId,
                tokenAddress,
            );
            if (fetchedBalance) {
                const parsedAmount = await TokenUtilService.getHumanReadableAmount(
                    fetchedBalance,
                    tokenAddress,
                );
                setBalance(parsedAmount);
            }
        } catch (e) {
            console.log(e);
        }
    };
    return (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Link Vault</CardTitle>
                <CardDescription>Test link vault balance with deposit assets</CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="link">Link ID</Label>
                            <Input
                                id="link"
                                placeholder="Link ID"
                                value={linkId}
                                onChange={onLinkIdChange}
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
                    </div>
                </form>
                <div className="mt-3">Balance: {balance}</div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={props.onCancel}>
                    Cancel
                </Button>
                <Button onClick={handleSubmitForm}>Query</Button>
            </CardFooter>
        </Card>
    );
}
