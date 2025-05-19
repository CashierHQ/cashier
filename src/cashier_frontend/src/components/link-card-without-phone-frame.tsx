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

export default function LinkCardWithoutPhoneFrame({
    displayComponent,
    title,
    message,
    label,
    onClaim,
    disabled,
    showHeader = false,
    headerText = "",
}: {
    displayComponent?: React.ReactNode;
    title: string;
    message: string;
    label: string;
    onClaim?: () => void;
    disabled?: boolean;
    showHeader?: boolean;
    headerText?: string;
}) {
    return (
        <div className="w-full flex relative flex-col items-center bg-lightgreen rounded-xl py-5 px-8">
            {showHeader && (
                <div className="w-full absolute top-0 left-0 flex flex-col items-center bg-green rounded-t-xl">
                    <h3 className="text-[18px] text-white font-medium py-1">{headerText}</h3>
                </div>
            )}
            <div
                className={`w-full flex flex-col items-center bg-lightgreen rounded-xl p-3 ${showHeader ? "mt-5" : "mt-3"}`}
            >
                {displayComponent}
                <div className="mb-8 text-center">
                    <h3 className="text-[16px] font-medium mt-2">{title}</h3>
                    <h3 className="text-[14px] font-light text-[#475467]/80 mt-1">{message}</h3>
                </div>

                {disabled ? (
                    <div
                        className={cn(
                            "text-green bg-white rounded-full py-3 px-8 mt-3 text-base w-[100%] text-center font-bold",
                            onClaim ? "cursor-pointer" : "",
                        )}
                    >
                        {label}
                    </div>
                ) : (
                    <div
                        className={cn(
                            "text-white bg-green rounded-full py-2 px-8 mt-3 w-[100%] text-center",
                            onClaim ? "cursor-pointer" : "",
                        )}
                        onClick={onClaim}
                    >
                        {label}
                    </div>
                )}
            </div>
        </div>
    );
}
