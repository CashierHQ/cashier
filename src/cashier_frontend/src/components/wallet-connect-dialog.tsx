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

import React, { FC } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { HoverBorderGradient } from "./ui/hover-border-gradient";

// Wallet option interface
export interface WalletOption {
    id: string;
    name: string;
    icon: string | JSX.Element; // Support both string and JSX.Element for icons
    onClick: () => void;
}

export interface WalletConnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    walletOptions: WalletOption[];
    title?: string;
    viewAllLink?: boolean;
    onViewAll?: () => void;
}

const WalletConnectDialog: FC<WalletConnectDialogProps> = ({
    open,
    onOpenChange,
    walletOptions,
    title = "Connect your wallet",
    viewAllLink = true,
    onViewAll,
}) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-3xl w-[95%] max-w-md p-4 bg-white text-gray-900 border border-gray-200">
                <AlertDialogHeader className="text-left">
                    <div className="flex items-center justify-between mb-4">
                        <AlertDialogTitle className="text-gray-900">{title}</AlertDialogTitle>
                        <X
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer text-gray-600 hover:text-gray-900"
                            size={28}
                            strokeWidth={1.5}
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        {walletOptions.map((wallet) => (
                            <WalletOption
                                key={wallet.id}
                                name={wallet.name}
                                icon={wallet.icon}
                                onClick={wallet.onClick}
                            />
                        ))}
                    </div>

                    {viewAllLink && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={onViewAll}
                                className="text-teal-600 hover:text-teal-800 transition-colors text-sm"
                            >
                                View all
                            </button>
                        </div>
                    )}
                </AlertDialogHeader>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// Individual wallet option component
const WalletOption: FC<{
    name: string;
    icon: string | JSX.Element;
    onClick: () => void;
}> = ({ name, icon, onClick }) => {
    const renderIcon = () => {
        if (typeof icon === "string") {
            return <img src={icon} alt={`${name} icon`} className="w-6 h-6 rounded-full" />;
        }
        // If icon is a JSX.Element, return it directly
        return React.cloneElement(icon as React.ReactElement, {
            className: "w-6 h-6",
        });
    };

    return (
        <HoverBorderGradient
            containerClassName="rounded-full w-full"
            as="button"
            className="dark:bg-black bg-white text-black dark:text-white flex items-center justify-between w-full px-4 py-3"
            onClick={onClick}
        >
            <div className="flex items-center space-x-3">
                {renderIcon()}
                <span>{name}</span>
            </div>
        </HoverBorderGradient>
    );
};

export default WalletConnectDialog;
