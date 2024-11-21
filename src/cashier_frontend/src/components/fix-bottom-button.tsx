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
                    "fixed bottom-[30px] w-[80vw] max-w-[350px] left-1/2 -translate-x-1/2 py-5",
                )}
                ref={ref}
                {...props}
            />
        );
    },
);

FixedBottomButton.displayName = "FixedBottomButton";
