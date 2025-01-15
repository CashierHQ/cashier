import React, { FC } from "react";
import { cn } from "@/lib/utils";
import { Toast, ToastClose, ToastProvider, ToastViewport } from "@/components/ui/toast";
import { FiXCircle } from "react-icons/fi";
import { CiCircleCheck } from "react-icons/ci";
import { cva, type VariantProps } from "class-variance-authority";

// Define custom variants
const transactionToastVariants = cva(
    "bg-[#FFFAF2] group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
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
    onOpenChange?: (open: boolean) => void;
}

const TransactionToast: FC<TransactionToastProps> = ({
    open,
    title,
    description,
    variant,
    onOpenChange,
}) => {
    return (
        <ToastProvider>
            <Toast
                open={open}
                onOpenChange={onOpenChange}
                className={cn(transactionToastVariants({ variant }))}
            >
                <div className="grid gap-1">
                    <div className="flex items-center">
                        {variant === "default" ? (
                            <CiCircleCheck color="green" size={48} />
                        ) : (
                            <FiXCircle color="red" size={48} />
                        )}

                        <div className="ml-3">
                            <div className="text-xl font-medium text-black">{title}</div>
                            <div className="text-md opacity-90">{description}</div>
                        </div>
                    </div>
                </div>
                <ToastClose />
            </Toast>
            <ToastViewport className="fixed bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2" />
        </ToastProvider>
    );
};

export default TransactionToast;
