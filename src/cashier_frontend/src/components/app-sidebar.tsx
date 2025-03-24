import { NavigationMenu, NavigationMenuLink } from "./ui/navigation-menu";
import { SheetHeader, SheetContent, SheetTitle, SheetFooter } from "./ui/sheet";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";
import { IoExitOutline } from "react-icons/io5";
import { BOTTOM_MENU_ITEMS, TOP_MENU_ITEMS } from "@/constants/otherConst";
import { useAuth } from "@nfid/identitykit/react";
import { transformShortAddress } from "@/utils";
import { FaRegCopy } from "react-icons/fa";
import copy from "copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface SidebarMenuItem {
    title: string;
    icon: React.ReactNode;
    docSource: string;
}

interface AppSidebarProps {
    onItemClick: (docSource: string) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = (props: AppSidebarProps) => {
    const { user, disconnect } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleCopy = (e: React.SyntheticEvent) => {
        try {
            e.stopPropagation();
            copy(user?.principal.toString() ?? "");
            toast({
                description: "Copied",
            });
        } catch (err) {
            console.log("🚀 ~ handleCopyLink ~ err:", err);
        }
    };

    const handleDisConnect = () => {
        disconnect();
        navigate("/");
    };

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
            <div>
                <div
                    className={cn(
                        "w-[100%] font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors focus:bg-accent focus:text-accent-foreground",
                    )}
                >
                    <div className="flex items-center">
                        <div className="flex items-center cursor-pointer" onClick={handleCopy}>
                            <span className="mr-1">
                                <LuWallet2 color="green" size={22} />
                            </span>
                            {transformShortAddress(user?.principal?.toString() || "")}
                            <span className="ml-2">
                                <FaRegCopy color="gray" size={20} />
                            </span>
                        </div>

                        <span className="ml-auto">
                            <IoExitOutline color="gray" size={24} onClick={handleDisConnect} />
                        </span>
                    </div>
                </div>
            </div>
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
