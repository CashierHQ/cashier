// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
