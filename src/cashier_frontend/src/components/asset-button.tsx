import React from "react";
import { cn } from "@/lib/utils";
import { FaChevronDown } from "react-icons/fa";

interface AssetButtonProps {
    handleClick: () => void;
    text: string;
}

const AssetButton: React.FC<AssetButtonProps> = ({ text, handleClick }) => {
    return (
        <button
            onClick={handleClick}
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
                <span className="flex-grow text-left">{text}</span>{" "}
            </span>
            <FaChevronDown className="ml-auto h-4 w-4" color="#36A18B" />
        </button>
    );
};

export default AssetButton;
