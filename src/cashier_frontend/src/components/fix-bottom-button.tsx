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
                    "rounded-full w-[95%] max-w-[350px] py-6 mx-auto block text-center flex items-center justify-center",
                )}
                ref={ref}
                {...props}
            />
        );
    },
);

FixedBottomButton.displayName = "FixedBottomButton";
