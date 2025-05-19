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

import { cn } from "@/lib/utils";
import { FC, forwardRef, HTMLAttributes } from "react";

const w = "w-[50%] md:w-[40%]";

export const PhoneNotch = forwardRef<
    HTMLDivElement,
    Omit<HTMLAttributes<HTMLDivElement>, "children">
>(({ className, ...props }, ref) => {
    return (
        <div
            data-name="phone-notch-section"
            ref={ref}
            className={cn(
                "flex w-3/5 h-3 md:h-1 2xl:h-5 bg-black items-center border-black border-8 rounded-b-2xl md:rounded-b-xl 2xl:rounded-b-2xl",
                className,
            )}
            {...props}
        />
    );
});

export const PhoneFrame = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ children, className, ...props }, ref) => {
        return (
            <div
                data-name="phone-frame"
                ref={ref}
                className={cn(
                    "flex flex-col items-center bg-white  rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] 2xl:rounded-[3rem] border-black border-8 mt-3 md:mt-1 2xl:mt-3 px-3 pb-10 aspect-[9/16]",
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        );
    },
);

export const Phone = {
    Frame: PhoneFrame,
    Notch: PhoneNotch,
};
