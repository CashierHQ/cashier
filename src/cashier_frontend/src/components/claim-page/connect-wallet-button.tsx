import { ConnectWalletButton } from "@nfid/identitykit/react";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";

interface WalletButtonProps {
    handleConnect: () => void;
}

const WalletButton: React.FC<WalletButtonProps> = ({ handleConnect }) => {
    return (
        <button
            onClick={handleConnect}
            type="button"
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
            <span className="flex items-center">
                <LuWallet2 className="mr-2 h-4 w-4" color="green" />
                <span className="flex-grow text-left">Connect wallet and claim</span>{" "}
            </span>
        </button>
    );
};

export default WalletButton;
