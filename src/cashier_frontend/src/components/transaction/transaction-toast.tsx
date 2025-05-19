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

import React, { FC, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { cva, type VariantProps } from "class-variance-authority";
import { IoIosCloseCircle } from "react-icons/io";
import { FaCircleCheck } from "react-icons/fa6";
import { X } from "lucide-react";
import { FaInfoCircle } from "react-icons/fa";

// Define custom variants
const transactionToastVariants = cva(
    "bg-[#FFFAF2] group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-xl border-0 p-4 pr-6 shadow-lg transition-all",
    {
        variants: {
            variant: {
                default: "border-green-200 text-green-900",
                success: "border-green-200 text-green-900",
                error: "border-red-200 text-red-900",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface TransactionToastProps extends VariantProps<typeof transactionToastVariants> {
    open: boolean;
    title: string;
    description: string;
    onOpenChange: (open: boolean) => void;
    icon?: React.ReactNode;
    boldText?: boolean;
    duration?: number;
}

const TransactionToast: FC<TransactionToastProps> = ({
    open,
    title,
    description,
    variant,
    onOpenChange,
    icon,
    boldText,
    duration = 5000,
}) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!open) {
            setProgress(100);
            return;
        }

        // Reset progress when toast opens
        setProgress(100);

        // Calculate the decrement per interval
        const intervalMs = 50; // Update every 50ms for smoother performance
        const steps = duration / intervalMs;
        const decrementPerStep = 100 / steps;

        const timer = setInterval(() => {
            setProgress((prevProgress) => {
                // If progress is very close to zero, finish it off to avoid visual glitches
                if (prevProgress <= decrementPerStep) {
                    clearInterval(timer);
                    setTimeout(() => onOpenChange(false), 50);
                    return 0;
                }
                return prevProgress - decrementPerStep;
            });
        }, intervalMs);

        // Safety timeout to ensure toast closes after the duration
        const safetyTimeout = setTimeout(() => {
            onOpenChange(false);
        }, duration);

        return () => {
            clearInterval(timer);
            clearTimeout(safetyTimeout);
        };
    }, [open, duration, onOpenChange]);

    const descriptionStyles = {
        default: "text-[14px] opacity-90 text-[#8D8D8D] font-normal",
        success: "text-[14px] opacity-90 text-green font-normal",
        error: "text-[14px] opacity-90 text-red font-normal",
    };

    return (
        <ToastProvider>
            <Toast
                open={open}
                duration={duration}
                onOpenChange={onOpenChange}
                className={cn(transactionToastVariants({ variant }), "pointer-events-none")}
            >
                <div className="grid gap-1 w-full pointer-events-auto">
                    <div className="flex items-start">
                        <div className="">
                            {icon ? (
                                icon
                            ) : variant === "default" ? (
                                <FaInfoCircle color="#36A18B" size={26} />
                            ) : variant === "success" ? (
                                <FaCircleCheck color="#36A18B" size={26} />
                            ) : (
                                <IoIosCloseCircle color="red" size={26} />
                            )}
                        </div>

                        <div className="ml-3 flex-1 flex flex-col h-full justify-center">
                            <div className="flex flex-col gap-0.5 justify-center items-start">
                                {title && (
                                    <div className="flex items-center justify-between">
                                        <div className="text-[14px] font-semibold text-black">
                                            {title}
                                        </div>
                                    </div>
                                )}
                                {description && variant && (
                                    <div className={cn(descriptionStyles[variant])}>
                                        {description}
                                    </div>
                                )}
                            </div>
                        </div>

                        <X
                            onClick={() => onOpenChange(false)}
                            className="cursor-pointer ml-auto"
                            size={20}
                            color="#98A2B3"
                        />
                    </div>
                    {/* Progress bar */}
                    {/* <div className="h-1 w-full bg-gray-200 mt-2 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-100",
                                variant === "default" ? "bg-green" : "bg-red-500",
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div> */}
                </div>
            </Toast>
            <ToastViewport className="fixed bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2 z-60 pointer-events-none w-full" />
        </ToastProvider>
    );
};

export default TransactionToast;
