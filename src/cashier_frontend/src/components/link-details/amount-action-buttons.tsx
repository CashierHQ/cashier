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

import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AmountActionButtonData {
    content?: ReactNode;
    action: () => void;
}

interface AmountActionButtons {
    data: AmountActionButtonData[];
    isDisabled?: boolean;
}

export function AmountActionButtons({ data, isDisabled }: AmountActionButtons) {
    return (
        <div className="flex justify-between w-full mx-auto gap-2">
            {data.map(({ content, action }, index) => (
                <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="icon"
                    className={`asset-amount-percentage-button focus:border-green focus:text-green focus:bg-white`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Button clicked");
                        action();
                    }}
                    disabled={isDisabled}
                >
                    {content}
                </Button>
            ))}
        </div>
    );
}
