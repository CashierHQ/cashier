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

import React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./ui/button";

interface FixedBottomButtonProps extends ButtonProps {
    customStyle?: string;
}

export const FixedBottomButton = React.forwardRef<HTMLButtonElement, FixedBottomButtonProps>(
    ({ className, customStyle, ...props }, ref) => {
        return (
            <div className="w-full flex-shrink-0 flex justify-center mt-auto">
                <Button
                    className={cn(
                        className,
                        customStyle,
                        "rounded-full w-full max-w-[350px] h-[44px] mx-4 text-center flex items-center justify-center",
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        );
    },
);

FixedBottomButton.displayName = "FixedBottomButton";
