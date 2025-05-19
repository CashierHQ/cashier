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
import { Info } from "lucide-react";
import { HTMLAttributes } from "react";

export interface MessageProps extends HTMLAttributes<HTMLDivElement> {}

export function Message({ children, className, ...props }: MessageProps) {
    return (
        <div className={cn("flex place-items-start", className)} {...props}>
            <Info className="text-green mr-2" size={22} />
            <p className="text-green w-fit text-[14px]">{children}</p>
        </div>
    );
}
