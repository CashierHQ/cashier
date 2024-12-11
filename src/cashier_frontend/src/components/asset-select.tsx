import {
    Select,
    SelectContent,
    SelectGroup,
    SelectLabel,
    SelectTrigger,
    SelectValue,
    SelectItem,
} from "@/components/ui/select";
import { FormControl } from "./ui/form";

export interface AssetSelectItem {
    name: string;
    amount: number;
}

export default function AssetSelect({
    assetList,
    defaultValue,
}: {
    assetList: AssetSelectItem[];
    defaultValue?: string;
}) {
    return (
        <Select defaultValue={defaultValue}>
            <FormControl>
                <>
                    <SelectTrigger className="w-[300px] h-[100%]">
                        <SelectValue placeholder="Select a fruit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Choose assets</SelectLabel>
                            {assetList?.map((asset) => (
                                <SelectItem key={asset.name} value={asset.name}>
                                    <div className="flex">
                                        <img
                                            id="asset-logo"
                                            src="/ICP_logo.png"
                                            width={40}
                                            className="mr-5"
                                        />
                                        <div id="asset-info" className="text-md text-left">
                                            <div>{asset.name}</div>
                                            <div>
                                                Balance {asset.amount}
                                                {asset.name}
                                            </div>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </>
            </FormControl>
        </Select>
    );
}
