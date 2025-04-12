import React, { FC, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Toast, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { cva, type VariantProps } from "class-variance-authority";
import { IoIosClose } from "react-icons/io";
import { IoIosCloseCircle } from "react-icons/io";
import { FaCircleCheck } from "react-icons/fa6";

// Define custom variants
const transactionToastVariants = cva(
    "bg-[#FFFAF2] group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-xl border-0 p-4 pr-6 shadow-lg transition-all",
    {
        variants: {
            variant: {
                default: "border-green-200 text-green-900",
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
                        <div className="py-2">
                            {icon ? (
                                icon
                            ) : variant === "default" ? (
                                <FaCircleCheck color="#36A18B" size={28} />
                            ) : (
                                <IoIosCloseCircle color="red" size={28} />
                            )}
                        </div>

                        <div className="ml-3 flex-1">
                            {title.length > 0 ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div className="text-xl font-medium text-black">
                                            {title}
                                        </div>
                                        <IoIosClose
                                            onClick={() => onOpenChange(false)}
                                            className="cursor-pointer"
                                            size={38}
                                            color="#98A2B3"
                                        />
                                    </div>
                                    <div
                                        className={cn(
                                            variant == "default"
                                                ? "text-md opacity-90 text-green"
                                                : "text-md opacity-90 text-red",
                                            boldText ? "font-bold" : "",
                                        )}
                                    >
                                        {description}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div
                                            className={cn(
                                                variant == "default"
                                                    ? "text-md opacity-90 text-green"
                                                    : "text-md opacity-90 text-red",
                                                boldText ? "font-bold" : "",
                                            )}
                                        >
                                            {description}
                                        </div>
                                        <IoIosClose
                                            onClick={() => onOpenChange(false)}
                                            className="cursor-pointer ml-5"
                                            size={48}
                                            color="#98A2B3"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 w-full bg-gray-200 mt-2 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-100",
                                variant === "default" ? "bg-green" : "bg-red-500",
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </Toast>
            <ToastViewport className="fixed bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full" />
        </ToastProvider>
    );
};

export default TransactionToast;
