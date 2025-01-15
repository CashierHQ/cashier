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
interface TestFormProps {
    onCancel?: () => void;
}
export function TestForm(props: TestFormProps) {
    const [linkId, setLinkId] = React.useState("");
    const onLinkIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLinkId(e.target.value);
    };
    const handleSubmitForm = () => {
        console.log(linkId);
    };

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Create project</CardTitle>
                <CardDescription>Deploy your new project in one-click.</CardDescription>
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
                    </div>
                </form>
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
