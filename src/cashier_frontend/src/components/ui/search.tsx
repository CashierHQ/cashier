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

import { Search as LookingGlass } from "lucide-react";
import { Input } from "./input";
import { ComponentProps, forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const SearchRoot = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return <div ref={ref} className={cn("relative", className)} {...props} />;
    },
);

export const SearchIcon = forwardRef<SVGSVGElement, ComponentProps<typeof LookingGlass>>(
    ({ className, size = 24, ...props }, ref) => {
        return (
            <LookingGlass
                ref={ref}
                className={cn("absolute top-1/2 -translate-y-1/2 left-3 stroke-green", className)}
                size={size}
                {...props}
            />
        );
    },
);

export const SearchInput = forwardRef<HTMLInputElement, ComponentProps<typeof Input>>(
    ({ className, ...props }) => {
        return <Input className={cn("pl-11 py-2.5", className)} {...props} />;
    },
);

export const Search = {
    Root: SearchRoot,
    Icon: SearchIcon,
    Input: SearchInput,
};
