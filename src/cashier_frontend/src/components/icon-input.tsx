import React, { SyntheticEvent, useState, useEffect, useRef } from "react";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface IconInputProps extends InputProps {
    icon?: React.ReactNode;
    isCurrencyInput: boolean;
    currencySymbol?: string;
    isDisabled?: boolean;
    rightIcon?: React.ReactNode;
    onRightIconClick?: (e: SyntheticEvent) => void;
    onFocusShowIcon?: boolean;
    onFocusText?: boolean;
    value?: string | number;
}

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
    (
        {
            className,
            icon,
            rightIcon,
            onRightIconClick,
            isCurrencyInput,
            currencySymbol,
            onFocusText,
            value,
            ...props
        },
        ref,
    ) => {
        const [isFocused, setIsFocused] = useState(false);
        const inputRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (onFocusText && value) {
                setIsFocused(true);
            }
        }, [value, onFocusText]);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (
                    inputRef.current &&
                    !inputRef.current.contains(event.target as Node) &&
                    !value
                ) {
                    setIsFocused(false);
                }
            };

            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, [value]);

        if (isCurrencyInput) {
            return (
                <div className="relative">
                    <Input className={className} ref={ref} value={value} {...props} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {currencySymbol}
                    </div>
                </div>
            );
        } else {
            return (
                <div className="relative w-full" ref={inputRef}>
                    <Input
                        className={cn(
                            "pl-10 w-full rounded-lg",
                            "bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green focus:border-transparent",
                            value && "ring-1 ring-green border-transparent",
                            "autofill:bg-white autofill:!bg-white",
                            "[&:-webkit-autofill]:bg-white [&:-webkit-autofill]:!bg-white",
                            "[&:-webkit-autofill]:shadow-[0_0_0_30px_white_inset]",
                            "[&:-webkit-autofill]:[text-fill-color:inherit]",
                            rightIcon ? "pr-12" : "",
                            className,
                        )}
                        ref={ref}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                            console.log("onBlur");
                            setTimeout(() => setIsFocused(false), 0);
                        }}
                        value={value}
                        {...props}
                    />
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {icon}
                        </div>
                    )}
                    {rightIcon && (!props.onFocusShowIcon || isFocused) && (
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
