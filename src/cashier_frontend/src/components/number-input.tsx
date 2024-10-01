import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    handleIncrease: () => void;
    handleDecrease: () => void;
    min?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, handleIncrease, handleDecrease, ...props }, ref) => {
        return (
            <div className="flex gap-x-3  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-green">
                <Button type="button" variant="outline" size="icon" onClick={handleDecrease} className="text-green">
                    -
                </Button>
                <input
                    type="number"
                    className={cn(
                        "flex h-9 w-[100px] text-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-green disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                    ref={ref}
                    {...props}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleIncrease} className="text-green">
                    +
                </Button>
            </div>
        );
    },
);
NumberInput.displayName = "Input";

export { NumberInput };
