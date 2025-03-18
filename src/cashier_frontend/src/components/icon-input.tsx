import React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IconInputProps extends InputProps {
    icon?: React.ReactNode;
    isCurrencyInput: boolean;
    currencySymbol?: string;
    isDisabled?: boolean;
    rightIcon?: React.ReactNode;
    onRightIconClick?: () => void;
}

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
    (
        { className, icon, rightIcon, onRightIconClick, isCurrencyInput, currencySymbol, ...props },
        ref,
    ) => {
        if (isCurrencyInput) {
            return (
                <div className="relative">
                    <Input className={className} ref={ref} {...props} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {currencySymbol}
                    </div>
                </div>
            );
        } else {
            return (
                <div className="relative w-full">
                    <Input
                        className={cn(
                            "pl-10 w-full rounded-lg",
                            rightIcon ? "pr-12" : "",
                            className,
                        )}
                        ref={ref}
                        {...props}
                    />
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {icon}
                        </div>
                    )}
                    {rightIcon && (
                        <div
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            onClick={onRightIconClick}
                        >
                            {rightIcon}
                        </div>
                    )}
                </div>
            );
        }
    },
);

IconInput.displayName = "IconInput";

export { IconInput };
