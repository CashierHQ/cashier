import React from "react";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";
import { transformShortAddress } from "@/utils";

interface CustomConnectedWalletButtonProps {
    connectedAccount?: string;
}

const CustomConnectedWalletButton: React.FC<CustomConnectedWalletButtonProps> = ({
    connectedAccount,
}) => {
    return (
        <div
            className={cn(
                "w-full h-10 px-3 py-2",
                "bg-background text-foreground",
                "border border-input",
                "hover:bg-accent hover:text-accent-foreground",
                "rounded-md",
                "text-sm font-medium",
                "ring-offset-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "flex items-center justify-start",
            )}
        >
            <span className="flex items-center mr-3">
                <LuWallet2 className="mr-2" color="green" size={22} />
                <span className="flex-grow text-left">
                    {transformShortAddress(connectedAccount || "")}
                </span>{" "}
            </span>
        </div>
    );
};

export default CustomConnectedWalletButton;
