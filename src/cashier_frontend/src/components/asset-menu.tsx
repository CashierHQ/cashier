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

import * as React from "react";
import { cn } from "@/lib/utils";
import { NavigationMenu, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { TokenUtilService } from "@/services/tokenUtils.service";
import { FungibleToken } from "@/types/fungible-token.speculative";

interface AssetMenuProps {
    assetList: FungibleToken[];
    onSelect: (val: string) => void;
}

const Menu: React.FC<AssetMenuProps> = ({ assetList, onSelect }) => {
    return (
        <NavigationMenu className="w-[100%] max-w-[100%] justify-start">
            <ul className="w-[100%]">
                {assetList?.map((asset) => (
                    <ListItem key={asset.address} onSelected={onSelect} asset={asset} />
                ))}
            </ul>
        </NavigationMenu>
    );
};

interface AssetItemProps {
    asset: FungibleToken;
    onSelected: (val: string) => void;
    isLoadingBalance?: boolean;
}

const ListItem: React.FC<AssetItemProps> = ({ asset, onSelected }) => {
    const getTokenName = (name: string) => {
        return name;
    };

    const amount = TokenUtilService.getHumanReadableAmountFromToken(asset.amount ?? 0n, asset);

    return (
        <li>
            <NavigationMenuLink onSelect={() => onSelected(asset.address)} asChild>
                <a
                    className={cn(
                        "w-[100%] block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    )}
                >
                    <div className="flex items-center">
                        <Avatar className="mr-3">
                            <AvatarImage src={asset.logo} />
                            <AvatarFallback>{getTokenName(asset.name)}</AvatarFallback>
                        </Avatar>
                        <div id="asset-info" className="text-md text-left">
                            <div>{asset?.name}</div>
                        </div>
                        <div className="ml-auto">{`${amount}`}</div>
                    </div>
                </a>
            </NavigationMenuLink>
        </li>
    );
};
ListItem.displayName = "ListItem";

export default Menu;
