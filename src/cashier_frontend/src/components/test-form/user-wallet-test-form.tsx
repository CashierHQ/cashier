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
export function UserWalletTestForm(props: TestFormProps) {
    const [walletAddress, setWalletAddress] = React.useState("");
    const [canisterId, setCanisterId] = React.useState("");
    const [balance, setBalance] = React.useState(0);
    const identity = useIdentity();
    const onLinkIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWalletAddress(e.target.value);
    };
    const onCanisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCanisterId(e.target.value);
    };
    const handleSubmitForm = async () => {
        try {
            const canisterUtils = new CanisterUtilsService(identity);
            const fetchedBalance = await canisterUtils.checkAccountBalance(
                canisterId,
                walletAddress,
            );
            if (fetchedBalance) {
                const parsedAmount = await TokenUtilService.getHumanReadableAmount(
                    fetchedBalance,
                    canisterId,
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
                <CardTitle>User wallet</CardTitle>
                <CardDescription>
                    Test user wallet with wallet address and token address
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="link">Identity</Label>
                            <Input
                                id="link"
                                placeholder="Identity"
                                value={walletAddress}
                                onChange={onLinkIdChange}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="link">Canister</Label>
                            <Input
                                id="canister"
                                placeholder="Canister ID"
                                value={canisterId}
                                onChange={onCanisterChange}
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
