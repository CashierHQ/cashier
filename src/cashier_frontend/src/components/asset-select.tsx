// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
import { FungibleToken } from "@/types/fungible-token.speculative";

export type AssetSelectItem = Pick<FungibleToken, "id" | "name" | "address" | "amount" | "logo">;
export default function AssetSelect({
    assetList,
    defaultValue,
    onValueChange,
}: {
    assetList: AssetSelectItem[];
    defaultValue?: string;
    onValueChange: (value: string) => void;
}) {
    return (
        <Select defaultValue={defaultValue} onValueChange={onValueChange}>
            <FormControl>
                <>
                    <SelectTrigger className="w-[100%] h-[100%]">
                        <SelectValue placeholder="Choose asset" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Choose assets</SelectLabel>
                            {assetList?.map((asset) => (
                                <SelectItem key={asset.name} value={asset.address}>
                                    <div className="flex">
                                        <img
                                            id="asset-logo"
                                            src={asset.logo}
                                            width={40}
                                            className="mr-5"
                                        />
                                        <div id="asset-info" className="text-md text-left">
                                            <div>{asset.name}</div>
                                            <div>{`Balance ${asset.amount} ${asset.name}`}</div>
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
