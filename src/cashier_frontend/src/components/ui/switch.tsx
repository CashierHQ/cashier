// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { ComponentProps, forwardRef } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const SwitchRoot = forwardRef<
    HTMLButtonElement,
    ComponentProps<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => {
    return (
        <SwitchPrimitive.Root
            ref={ref}
            className={cn(
                "w-9 h-5 p-0.5 bg-lightgreen rounded-full transition-colors",
                'data-[state="checked"]:bg-green',
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-green",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
});
SwitchRoot.displayName = "SwitchRoot";

export const SwitchThumb = forwardRef<
    HTMLButtonElement,
    ComponentProps<typeof SwitchPrimitive.Thumb>
>(({ className, ...props }, ref) => {
    return (
        <SwitchPrimitive.Thumb
            ref={ref}
            className={cn(
                "block shadow w-4 h-4 rounded-full bg-white transition-transform",
                'data-[state="checked"]:translate-x-full ',
                className,
            )}
            {...props}
        />
    );
});

export default {
    Root: SwitchRoot,
    Thumb: SwitchThumb,
};
