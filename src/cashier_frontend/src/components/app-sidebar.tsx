import { NavigationMenu, NavigationMenuLink } from "./ui/navigation-menu";
import { SheetHeader, SheetContent, SheetTitle, SheetFooter } from "./ui/sheet";
import { cn } from "@/lib/utils";

import { BOTTOM_MENU_ITEMS, TOP_MENU_ITEMS } from "@/constants/otherConst";

export interface SidebarMenuItem {
    title: string;
    icon: React.ReactNode;
    docSource: string;
}

interface AppSidebarProps {
    onItemClick: (docSource: string) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = (props: AppSidebarProps) => {
    return (
        <SheetContent side="left" className="w-[100%] flex flex-col h-full">
            <SheetHeader>
                <SheetTitle>
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                </SheetTitle>
                <NavigationMenu className="w-[100%] max-w-[100%] flex-col flex-grow">
                    {TOP_MENU_ITEMS.map((item) => (
                        <ListItem
                            key={item.title}
                            title={item.title}
                            onClick={props.onItemClick}
                            icon={item.icon}
                            docSource={item.docSource}
                        />
                    ))}
                </NavigationMenu>
            </SheetHeader>

            <SheetFooter className="mt-auto">
                <NavigationMenu className="w-[100%] max-w-[100%] flex-col flex-grow">
                    {BOTTOM_MENU_ITEMS.map((item) => (
                        <ListItem
                            key={item.title}
                            title={item.title}
                            onClick={props.onItemClick}
                            icon={item.icon}
                            docSource={item.docSource}
                        />
                    ))}
                </NavigationMenu>
            </SheetFooter>
        </SheetContent>
    );
};

interface MenuItemProps {
    title: string;
    onClick: (docSource: string) => void;
    icon: React.ReactNode;
    docSource: string;
}

const ListItem: React.FC<MenuItemProps> = (props: MenuItemProps) => {
    return (
        <NavigationMenuLink onClick={() => props.onClick(props.docSource)} asChild>
            <a
                className={cn(
                    "w-[100%] font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-[#E8F2EE] hover:text-accent-foreground hover:text-[#36A18B] hover:cursor-pointer focus:bg-accent focus:text-accent-foreground",
                )}
            >
                <div className="flex items-center hover:text-[#36A18B]">
                    <span className="mr-1">{props.icon}</span>
                    {props.title}
                </div>
            </a>
        </NavigationMenuLink>
    );
};
ListItem.displayName = "ListItem";

export default AppSidebar;
