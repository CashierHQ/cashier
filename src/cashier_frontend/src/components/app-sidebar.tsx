import { SheetHeader, SheetContent, SheetTitle, SheetFooter } from "./ui/sheet";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";
import { IoExitOutline } from "react-icons/io5";
import { BOTTOM_MENU_ITEMS, TOP_MENU_ITEMS } from "@/constants/otherConst";
import { useAuth } from "@nfid/identitykit/react";
import { transformShortAddress } from "@/utils";
import copy from "copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Copy } from "lucide-react";
import { Separator } from "./ui/separator";

export interface SidebarMenuItem {
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
}

const AppSidebar: React.FC = () => {
    const { user } = useAuth();
    const { disconnect } = useAuth();
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
        <SheetContent side="right" className="w-[100%] flex flex-col h-full">
            <SheetHeader>
                <SheetTitle className="mb-2">
                    <img src="./logo.svg" alt="Cashier logo" className="max-w-[130px]" />
                </SheetTitle>
                <div className="w-[100%] flex flex-col flex-grow">
                    {TOP_MENU_ITEMS.map((item) => (
                        <ListItem
                            key={item.title}
                            title={item.title}
                            onClick={item.onClick}
                            icon={item.icon}
                        />
                    ))}
                </div>
            </SheetHeader>

            <SheetFooter className="mt-auto">
                <div className="flex flex-col w-full">
                    <div className="w-[100%] flex flex-col flex-grow">
                        {BOTTOM_MENU_ITEMS.map((item) => (
                            <ListItem
                                key={item.title}
                                title={item.title}
                                onClick={item.onClick}
                                icon={item.icon}
                            />
                        ))}
                    </div>

                    <Separator className="mb-4 mt-2 max-w-[100%] mx-auto opacity-50" />

                    <p className="text-[16px] text-[#36A18B] pl-3 font-medium">Connected wallet</p>
                    <ListItem
                        title={transformShortAddress(user?.principal?.toString() || "")}
                        onClick={() => {}}
                        className="mt-1"
                        icon={<LuWallet2 size={22} />}
                        iconRight={<Copy size={22} />}
                        onIconRightClick={handleCopy}
                        hoverDisabled
                    />

                    <button
                        onClick={handleDisConnect}
                        className="w-[95%] border border-[#D26060] mx-auto text-[#D26060] flex items-center justify-center rounded-full font-semibold text-[14px] h-[44px] mt-4 hover:bg-[#D26060] hover:text-white transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            </SheetFooter>
        </SheetContent>
    );
};

interface MenuItemProps {
    title: string;
    onClick: (_: any | null) => void;
    icon: React.ReactNode;
    className?: string;
    iconRight?: React.ReactNode;
    onIconRightClick?: (_: any | null) => void;
    hoverDisabled?: boolean;
}

const ListItem: React.FC<MenuItemProps> = (props: MenuItemProps) => {
    return (
        <button
            onClick={props.onClick}
            className={cn(
                `w-[100%] font-semibold block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors ${
                    props.hoverDisabled
                        ? ""
                        : "group hover:text-accent-foreground hover:text-[#36A18B] hover:cursor-pointer hover:bg-[#E8F2EE] focus:bg-accent focus:text-accent-foreground"
                }`,
                props.className,
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <span className="w-8 text-[#8D8D8D] group-hover:text-[#36A18B]">
                        {props.icon}
                    </span>
                    <span className="text-[16px] font-semibold text-[#222] group-hover:text-[#36A18B]">
                        {props.title}
                    </span>
                </div>
                {props.iconRight && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onIconRightClick?.(e);
                        }}
                        className="text-[#8D8D8D] hover:text-[#36A18B] transition-colors"
                    >
                        {props.iconRight}
                    </button>
                )}
            </div>
        </button>
    );
};
ListItem.displayName = "ListItem";

export default AppSidebar;
