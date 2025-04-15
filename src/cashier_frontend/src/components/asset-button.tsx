import React from "react";
import { cn } from "@/lib/utils";
import { FaChevronDown } from "react-icons/fa";
import { ChevronDown } from "lucide-react";

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
            className={cn("input-field-asset flex items-center")}
        >
            {childrenNode ? (
                <span className="flex items-center">
                    <span className="flex-grow text-left">{childrenNode}</span>
                </span>
            ) : (
                <span className="flex items-center">
                    <span className="flex-grow text-left">{text}</span>
                </span>
            )}

            <ChevronDown className="ml-auto" size={24} strokeWidth={2} color="#36A18B" />
        </button>
    );
};

export default AssetButton;
