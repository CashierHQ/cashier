import React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./ui/button";

interface FixedBottomButtonProps extends ButtonProps {
    customStyle?: string;
}

export const FixedBottomButton = React.forwardRef<HTMLButtonElement, FixedBottomButtonProps>(
    ({ className, customStyle, ...props }, ref) => {
        return (
            <Button
                className={cn(
                    className,
                    customStyle,
                    "fixed rounded-full bottom-[30px] md:bottom-[10px] w-[95%] max-w-[350px] left-1/2 -translate-x-1/2 py-6",
                )}
                ref={ref}
                {...props}
            />
        );
    },
);

FixedBottomButton.displayName = "FixedBottomButton";
