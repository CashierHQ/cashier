import React from "react";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";
import { transformShortAddress } from "@/utils";

interface CustomConnectedWalletButtonProps {
    connectedAccount?: string;
    postfixText?: string;
    postfixIcon?: React.ReactNode;
    handleConnect: () => void;
}

const CustomConnectedWalletButton: React.FC<CustomConnectedWalletButtonProps> = ({
    connectedAccount,
    postfixText,
    postfixIcon,
    handleConnect,
}) => {
    return (
        <button
            className={cn(
                "w-full h-12 px-3",
                "bg-background text-foreground",
                "border border-input border-[#35A18B]",
                "hover:bg-accent hover:text-accent-foreground",
                "rounded-xl",
                "text-md",
                "ring-offset-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "flex items-center justify-start",
            )}
            onClick={(e) => {
                // Prevent form submission
                e.preventDefault();
                e.stopPropagation();
                console.log("Connected account:", connectedAccount);
                handleConnect();
            }}
        >
            <span className="flex items-center w-full">
                {postfixIcon ? (
                    postfixIcon
                ) : (
                    <LuWallet2 className="mr-2" color="#35A18B" size={22} />
                )}
                <span className="flex-grow text-left">
                    {transformShortAddress(connectedAccount || "")}
                </span>{" "}
                {postfixText && <span className="ml-auto text-[#35A18B]">{postfixText}</span>}
            </span>
        </button>
    );
};

export default CustomConnectedWalletButton;
