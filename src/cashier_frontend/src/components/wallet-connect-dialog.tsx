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

import React, { FC, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { HoverBorderGradient } from "./ui/hover-border-gradient";

// Wallet option interface
export interface WalletOption {
    id: string;
    name: string;
    icon: string | JSX.Element;
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
    const dialogRef = useRef<HTMLDivElement>(null);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
                onOpenChange(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, onOpenChange]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onOpenChange(false);
            }
        };

        if (open) {
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open, onOpenChange]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 animate-in fade-in-0"
                onClick={() => onOpenChange(false)}
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                className="relative z-50 rounded-3xl w-[95%] max-w-md p-4 bg-white text-gray-900 border border-gray-200 animate-in zoom-in-95"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id="dialog-title" className="text-xl font-semibold text-gray-900">
                        {title}
                    </h2>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Close dialog"
                    >
                        <X size={28} strokeWidth={1.5} />
                    </button>
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
            </div>
        </div>
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
