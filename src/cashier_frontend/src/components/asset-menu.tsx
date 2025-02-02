import * as React from "react";
import { cn } from "@/lib/utils";
import { NavigationMenu, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { AssetSelectItem } from "./asset-select";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer.service";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface AssetMenuProps {
    assetList: AssetSelectItem[];
    onSelect: (val: string) => void;
    isLoadingBalance?: boolean;
}

const Menu: React.FC<AssetMenuProps> = ({ assetList, onSelect, isLoadingBalance }) => {
    return (
        <NavigationMenu className="w-[100%] max-w-[100%] justify-start">
            <ul className="w-[100%]">
                {assetList?.map((asset) => (
                    <ListItem
                        key={asset.tokenAddress}
                        onSelected={onSelect}
                        asset={asset}
                        isLoadingBalance={isLoadingBalance}
                    />
                ))}
            </ul>
        </NavigationMenu>
    );
};

interface AssetItemProps {
    asset: AssetSelectItem;
    onSelected: (val: string) => void;
    isLoadingBalance?: boolean;
}

const ListItem: React.FC<AssetItemProps> = ({ asset, onSelected, isLoadingBalance }) => {
    return (
        <li>
            <NavigationMenuLink onSelect={() => onSelected(asset.tokenAddress)} asChild>
                <a
                    className={cn(
                        "w-[100%] block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    )}
                >
                    <div className="flex items-center">
                        <Avatar className="mr-3">
                            <AvatarImage src={`${IC_EXPLORER_IMAGES_PATH}${asset.tokenAddress}`} />
                            <AvatarFallback>{asset.name}</AvatarFallback>
                        </Avatar>
                        <div id="asset-info" className="text-md text-left">
                            <div>{asset?.name}</div>
                        </div>
                        <div className="ml-auto">
                            {isLoadingBalance ? (
                                <Skeleton className="w-[130px] h-4" />
                            ) : (
                                `${asset?.amount}`
                            )}
                        </div>
                    </div>
                </a>
            </NavigationMenuLink>
        </li>
    );
};
ListItem.displayName = "ListItem";

export default Menu;
