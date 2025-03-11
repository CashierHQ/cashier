import React from "react";
import { cn } from "@/lib/utils";
import { LuWallet2 } from "react-icons/lu";

interface WalletButtonProps {
    title: string;
    handleConnect: () => void;
    className?: string;
    disabled?: boolean;
    image?: string;
    icon?: React.ReactNode;
    postfixText?: string;
}

const WalletButton: React.FC<WalletButtonProps> = ({
    title,
    handleConnect,
    className,
    disabled,
    image,
    icon,
    postfixText,
}) => {
    return (
        <button
            onClick={handleConnect}
            type="button"
            className={cn(
                className,
                "w-full h-12 px-3 py-5 my-3",
                "border border-input",
                "rounded-md",
                "text-md",
                "ring-offset-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "flex items-center justify-start",
                disabled
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            disabled={disabled}
        >
            <span className="flex items-center w-full">
                {image ? (
                    <img src={image} alt={title} className="h-6 w-6 mr-2" />
                ) : (
                    icon || <LuWallet2 className="mr-2 h-6 w-6" color="green" />
                )}
                <span className="flex-grow text-left">{title}</span>
                {postfixText && <span className="ml-auto">{postfixText}</span>}
            </span>
        </button>
    );
};

export default WalletButton;
