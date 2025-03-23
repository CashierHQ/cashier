import React, { FC } from "react";
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
}

const TransactionToast: FC<TransactionToastProps> = ({
    open,
    title,
    description,
    variant,
    onOpenChange,
    icon,
    boldText,
}) => {
    return (
        <ToastProvider>
            <Toast
                open={open}
                duration={Infinity}
                onOpenChange={onOpenChange}
                className={cn(transactionToastVariants({ variant }))}
            >
                <div className="grid gap-1 w-full">
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
                </div>
            </Toast>
            <ToastViewport className="fixed bottom-20 sm:bottom-20 left-1/2 -translate-x-1/2" />
        </ToastProvider>
    );
};

export default TransactionToast;
