import React from "react";
import { cn } from "@/lib/utils";
import { FaChevronDown } from "react-icons/fa";

interface AssetButtonProps {
    handleClick: () => void;
    text: string;
    childrenNode?: React.ReactNode;
}

const AssetButton: React.FC<AssetButtonProps> = ({ text, handleClick, childrenNode }) => {
    return (
        <button
            onClick={handleClick}
            type="button"
            className={cn(
                "w-full px-3 py-2",
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
            {childrenNode ? (
                <span className="flex items-center">
                    <span className="flex-grow text-left">{childrenNode}</span>{" "}
                </span>
            ) : (
                <span className="flex items-center">
                    <span className="flex-grow text-left">{text}</span>{" "}
                </span>
            )}

            <FaChevronDown className="ml-auto h-4 w-4" color="#36A18B" />
        </button>
    );
};

export default AssetButton;
