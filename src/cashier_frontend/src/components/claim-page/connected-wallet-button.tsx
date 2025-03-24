import React from "react";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";
import { transformShortAddress } from "@/utils";

interface CustomConnectedWalletButtonProps {
    connectedAccount?: string;
    postfixText?: string;
    postfixIcon?: React.ReactNode;
}

const CustomConnectedWalletButton: React.FC<CustomConnectedWalletButtonProps> = ({
    connectedAccount,
    postfixText,
    postfixIcon,
}) => {
    return (
        <button
            className={cn(
                "w-full h-14 px-3 py-5 space-y-2 my-3",
                "bg-background text-foreground",
                "border border-input border-green",
                "hover:bg-accent hover:text-accent-foreground",
                "rounded-xl",
                "text-md",
                "ring-offset-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "flex items-center justify-start",
            )}
        >
            <span className="flex items-center w-full">
                {postfixIcon ? postfixIcon : <LuWallet2 className="mr-2" color="green" size={22} />}
                <span className="flex-grow text-left">
                    {transformShortAddress(connectedAccount || "")}
                </span>{" "}
                {postfixText && <span className="ml-auto text-green">{postfixText}</span>}
            </span>
        </button>
    );
};

export default CustomConnectedWalletButton;
