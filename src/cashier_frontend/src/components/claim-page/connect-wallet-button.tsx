// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
                "w-full h-12 px-3",
                "border border-grey/20",
                "rounded-xl",
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
            <span className="flex items-center w-full text-[14px]">
                {image ? (
                    <img src={image} alt={title} className="h-6 w-6 mr-2" />
                ) : (
                    icon || <LuWallet2 className="mr-2 h-6 w-6" color="#359F89" />
                )}
                <span className="flex-grow text-left">{title}</span>
                {postfixText && <span className="ml-auto">{postfixText}</span>}
            </span>
        </button>
    );
};

export default WalletButton;
