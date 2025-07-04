// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
