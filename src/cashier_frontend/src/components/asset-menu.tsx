import * as React from "react";
import { cn } from "@/lib/utils";
import { NavigationMenu, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { AssetSelectItem } from "./asset-select";
import { IC_EXPLORER_IMAGES_PATH } from "@/services/icExplorer";

interface AssetMenuProps {
    assetList: AssetSelectItem[];
    onSelect: (val: string) => void;
}

const Menu: React.FC<AssetMenuProps> = ({ assetList, onSelect }) => {
    return (
        <NavigationMenu
            onValueChange={(val) => console.log(val)}
            className="w-[100%] max-w-[100%] justify-start"
        >
            <ul className="w-[100%]">
                {assetList?.map((asset) => (
                    <ListItem key={asset.tokenAddress} onSelected={onSelect} asset={asset} />
                ))}
            </ul>
        </NavigationMenu>
    );
};

interface AssetItemProps {
    asset: AssetSelectItem;
    onSelected: (val: string) => void;
}

const ListItem: React.FC<AssetItemProps> = ({ asset, onSelected }) => {
    return (
        <li>
            <NavigationMenuLink onSelect={() => onSelected(asset.tokenAddress)} asChild>
                <a
                    className={cn(
                        "w-[100%] block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    )}
                >
                    <div className="flex items-center">
                        <img
                            id="asset-logo"
                            src={`${IC_EXPLORER_IMAGES_PATH}${asset?.tokenAddress}`}
                            width={40}
                            className="mr-5"
                        />

                        <div id="asset-info" className="text-md text-left">
                            <div>{asset?.name}</div>
                        </div>
                        <div className="ml-auto">{`${asset?.amount}`}</div>
                    </div>
                </a>
            </NavigationMenuLink>
        </li>
    );
};
ListItem.displayName = "ListItem";

export default Menu;
