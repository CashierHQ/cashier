import React from "react";
import { cn } from "@/lib/utils";
import CurrencyInput from "react-currency-input-field";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    suffix: string;
    defaultValue: string | number | undefined;
    step: number | undefined;
    onValueChange: (value: string | undefined) => void;
}

const MaskInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, suffix, step, defaultValue, onValueChange, ...props }, ref) => {
        return (
            <div className="flex gap-x-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-green">
                <CurrencyInput
                    className={cn(
                        "flex h-9 w-[100%] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-green disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                    suffix={suffix}
                    defaultValue={defaultValue}
                    ref={ref}
                    allowDecimals={true}
                    allowNegativeValue={false}
                    decimalsLimit={4}
                    step={step}
                    placeholder="Enter amount"
                    onValueChange={(value) => onValueChange(value ?? "")}
                    {...props}
                />
            </div>
        );
    },
);
MaskInput.displayName = "MaskInput";

export { MaskInput };
