import React, { FC } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

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
            return (
                <img
                    src={icon}
                    alt={`${name} icon`}
                    className="w-6 h-6 rounded-full border border-gray-300"
                />
            );
        }
        // If icon is a JSX.Element, return it directly
        return React.cloneElement(icon as React.ReactElement, {
            className: "w-6 h-6",
        });
    };

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white hover:bg-gray-50 transition-colors text-gray-900 text-left border border-gray-300 hover:border-gray-900"
        >
            {renderIcon()}
            <div className="">{name}</div>
        </button>
    );
};

export default WalletConnectDialog;
